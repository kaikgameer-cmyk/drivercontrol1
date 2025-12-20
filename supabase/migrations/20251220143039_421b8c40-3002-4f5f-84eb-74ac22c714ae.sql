-- ============================================================
-- CORREÇÃO: Adicionar colunas e backfill sem trigger
-- ============================================================

-- 1) Adicionar colunas de status/totais em credit_card_invoices (se não existirem)
ALTER TABLE public.credit_card_invoices
  ADD COLUMN IF NOT EXISTS paid_total numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open';

-- 2) Criar tabela de transações do cartão (se não existe)
CREATE TABLE IF NOT EXISTS public.credit_card_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  credit_card_id uuid NOT NULL REFERENCES public.credit_cards(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.credit_card_invoices(id) ON DELETE SET NULL,
  date date NOT NULL,
  amount numeric(12,2) NOT NULL,
  description text,
  category text,
  type text NOT NULL DEFAULT 'purchase',
  source_expense_id uuid REFERENCES public.expenses(id) ON DELETE SET NULL,
  source_fuel_log_id uuid REFERENCES public.fuel_logs(id) ON DELETE SET NULL,
  current_installment integer DEFAULT 1,
  total_installments integer DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3) RLS para credit_card_transactions (se não existe)
ALTER TABLE public.credit_card_transactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'credit_card_transactions' 
    AND policyname = 'Users can view own transactions'
  ) THEN
    CREATE POLICY "Users can view own transactions" ON public.credit_card_transactions
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'credit_card_transactions' 
    AND policyname = 'Users can insert own transactions'
  ) THEN
    CREATE POLICY "Users can insert own transactions" ON public.credit_card_transactions
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'credit_card_transactions' 
    AND policyname = 'Users can update own transactions'
  ) THEN
    CREATE POLICY "Users can update own transactions" ON public.credit_card_transactions
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'credit_card_transactions' 
    AND policyname = 'Users can delete own transactions'
  ) THEN
    CREATE POLICY "Users can delete own transactions" ON public.credit_card_transactions
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 4) Índices
CREATE INDEX IF NOT EXISTS idx_cc_transactions_user ON public.credit_card_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_cc_transactions_card ON public.credit_card_transactions(credit_card_id);
CREATE INDEX IF NOT EXISTS idx_cc_transactions_invoice ON public.credit_card_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_cc_transactions_date ON public.credit_card_transactions(date);

-- 5) Remover triggers antigos para evitar conflito durante backfill
DROP TRIGGER IF EXISTS trg_cc_transaction_before ON public.credit_card_transactions;
DROP TRIGGER IF EXISTS trg_cc_transaction_after ON public.credit_card_transactions;

-- 6) Função recalc_invoice
CREATE OR REPLACE FUNCTION public.recalc_invoice(p_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total numeric := 0;
  v_paid_total numeric := 0;
  v_balance numeric := 0;
  v_status text := 'open';
  v_due_date date;
  v_closing_date date;
BEGIN
  IF p_invoice_id IS NULL THEN
    RETURN;
  END IF;

  SELECT due_date, closing_date INTO v_due_date, v_closing_date
  FROM public.credit_card_invoices
  WHERE id = p_invoice_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(
    CASE 
      WHEN type = 'refund' THEN -ABS(amount)
      WHEN type IN ('purchase', 'fee') THEN ABS(amount)
      ELSE 0
    END
  ), 0) INTO v_total
  FROM public.credit_card_transactions
  WHERE invoice_id = p_invoice_id;

  SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_paid_total
  FROM public.credit_card_transactions
  WHERE invoice_id = p_invoice_id AND type = 'payment';

  v_balance := v_total - v_paid_total;

  IF v_balance <= 0 THEN
    v_status := 'paid';
  ELSIF CURRENT_DATE > v_due_date AND v_balance > 0 THEN
    v_status := 'overdue';
  ELSIF CURRENT_DATE > v_closing_date AND v_balance > 0 THEN
    v_status := 'closed';
  ELSE
    v_status := 'open';
  END IF;

  UPDATE public.credit_card_invoices
  SET 
    total_amount = v_total,
    paid_total = v_paid_total,
    balance = v_balance,
    status = v_status,
    is_paid = (v_balance <= 0),
    paid_at = CASE WHEN v_balance <= 0 AND paid_at IS NULL THEN now() ELSE paid_at END,
    updated_at = now()
  WHERE id = p_invoice_id;
END;
$$;

-- ============================================================
-- BACKFILL: Migrar APENAS cartões com closing_day configurado
-- ============================================================

-- 7) Migrar expenses com cartão de crédito (que não sejam combustível)
-- APENAS cartões com closing_day e due_day configurados
INSERT INTO public.credit_card_transactions (
  user_id, credit_card_id, invoice_id, date, amount, description, category, type,
  source_expense_id, current_installment, total_installments, created_at
)
SELECT 
  e.user_id,
  e.credit_card_id,
  public.resolve_or_create_invoice_for_user(e.user_id, e.credit_card_id, e.date),
  e.date,
  ROUND(e.amount::numeric, 2),
  COALESCE(e.notes, e.category),
  e.category,
  'purchase',
  e.id,
  COALESCE(e.current_installment, 1),
  COALESCE(e.total_installments, 1),
  e.created_at
FROM public.expenses e
INNER JOIN public.credit_cards c ON c.id = e.credit_card_id
WHERE e.credit_card_id IS NOT NULL
  AND e.fuel_log_id IS NULL
  AND c.closing_day IS NOT NULL
  AND c.due_day IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.credit_card_transactions t 
    WHERE t.source_expense_id = e.id
  );

-- 8) Migrar fuel_logs com cartão de crédito
INSERT INTO public.credit_card_transactions (
  user_id, credit_card_id, invoice_id, date, amount, description, category, type,
  source_fuel_log_id, created_at
)
SELECT 
  f.user_id,
  f.credit_card_id,
  public.resolve_or_create_invoice_for_user(f.user_id, f.credit_card_id, f.date),
  f.date,
  ROUND(f.total_value::numeric, 2),
  COALESCE(f.station, 'Combustível') || ' - ' || f.fuel_type,
  'combustivel',
  'purchase',
  f.id,
  f.created_at
FROM public.fuel_logs f
INNER JOIN public.credit_cards c ON c.id = f.credit_card_id
WHERE f.credit_card_id IS NOT NULL
  AND c.closing_day IS NOT NULL
  AND c.due_day IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.credit_card_transactions t 
    WHERE t.source_fuel_log_id = f.id
  );

-- 9) Recalcular todas as faturas
DO $$
DECLARE
  inv RECORD;
BEGIN
  FOR inv IN SELECT id FROM public.credit_card_invoices LOOP
    PERFORM public.recalc_invoice(inv.id);
  END LOOP;
END;
$$;

-- 10) Migrar paid_bills para transactions (pagamentos)
-- Apenas para cartões com configuração válida
INSERT INTO public.credit_card_transactions (
  user_id, credit_card_id, invoice_id, date, amount, description, type, created_at
)
SELECT 
  pb.user_id,
  pb.credit_card_id,
  -- Vincular ao invoice mais próximo baseado no month_year
  (
    SELECT i.id FROM public.credit_card_invoices i
    WHERE i.credit_card_id = pb.credit_card_id
    AND i.closing_date >= (pb.month_year || '-01')::date
    ORDER BY i.closing_date ASC
    LIMIT 1
  ),
  pb.paid_at::date,
  ROUND(pb.amount::numeric, 2),
  'Pagamento fatura ' || pb.month_year,
  'payment',
  pb.created_at
FROM public.paid_bills pb
INNER JOIN public.credit_cards c ON c.id = pb.credit_card_id
WHERE c.closing_day IS NOT NULL
  AND c.due_day IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.credit_card_transactions t 
    WHERE t.credit_card_id = pb.credit_card_id 
      AND t.type = 'payment'
      AND t.description LIKE '%' || pb.month_year || '%'
  );

-- 11) Recalcular faturas novamente após pagamentos
DO $$
DECLARE
  inv RECORD;
BEGIN
  FOR inv IN SELECT id FROM public.credit_card_invoices LOOP
    PERFORM public.recalc_invoice(inv.id);
  END LOOP;
END;
$$;

-- ============================================================
-- TRIGGERS (criar APÓS o backfill)
-- ============================================================

-- 12) Trigger para auto-vincular transação à fatura correta
CREATE OR REPLACE FUNCTION public.trigger_cc_transaction_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_id uuid;
  v_old_invoice_id uuid;
  v_has_config boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.invoice_id IS NOT NULL THEN
      PERFORM public.recalc_invoice(OLD.invoice_id);
    END IF;
    RETURN OLD;
  END IF;

  -- Verificar se o cartão tem configuração válida
  SELECT (closing_day IS NOT NULL AND due_day IS NOT NULL) INTO v_has_config
  FROM public.credit_cards
  WHERE id = NEW.credit_card_id;

  IF NOT v_has_config THEN
    -- Cartão sem configuração, não vincular a fatura
    NEW.invoice_id := NULL;
    RETURN NEW;
  END IF;

  v_invoice_id := public.resolve_or_create_invoice_for_user(
    NEW.user_id, 
    NEW.credit_card_id, 
    NEW.date
  );

  IF TG_OP = 'UPDATE' THEN
    v_old_invoice_id := OLD.invoice_id;
  END IF;

  NEW.invoice_id := v_invoice_id;

  IF TG_OP = 'UPDATE' AND v_old_invoice_id IS DISTINCT FROM v_invoice_id AND v_old_invoice_id IS NOT NULL THEN
    PERFORM public.recalc_invoice(v_old_invoice_id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cc_transaction_before
  BEFORE INSERT OR UPDATE ON public.credit_card_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_cc_transaction_invoice();

-- 13) Trigger AFTER para recalcular totais
CREATE OR REPLACE FUNCTION public.trigger_cc_transaction_recalc()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  IF NEW.invoice_id IS NOT NULL THEN
    PERFORM public.recalc_invoice(NEW.invoice_id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cc_transaction_after
  AFTER INSERT OR UPDATE OR DELETE ON public.credit_card_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_cc_transaction_recalc();

-- 14) Trigger de updated_at
DROP TRIGGER IF EXISTS update_cc_transactions_updated_at ON public.credit_card_transactions;
CREATE TRIGGER update_cc_transactions_updated_at
  BEFORE UPDATE ON public.credit_card_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();