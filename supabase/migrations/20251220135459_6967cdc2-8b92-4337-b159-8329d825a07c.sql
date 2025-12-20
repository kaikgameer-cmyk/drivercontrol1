
-- 1) Adicionar colunas faltantes em credit_cards
ALTER TABLE public.credit_cards
ADD COLUMN IF NOT EXISTS closing_day integer,
ADD COLUMN IF NOT EXISTS due_month_offset integer DEFAULT 1;

-- 2) Criar tabela credit_card_invoices
CREATE TABLE IF NOT EXISTS public.credit_card_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  credit_card_id uuid NOT NULL REFERENCES public.credit_cards(id) ON DELETE CASCADE,
  closing_date date NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  due_date date NOT NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  is_paid boolean NOT NULL DEFAULT false,
  paid_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (credit_card_id, closing_date)
);

-- Enable RLS
ALTER TABLE public.credit_card_invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own invoices"
ON public.credit_card_invoices FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoices"
ON public.credit_card_invoices FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoices"
ON public.credit_card_invoices FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own invoices"
ON public.credit_card_invoices FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_credit_card_invoices_updated_at
BEFORE UPDATE ON public.credit_card_invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Adicionar invoice_id em expenses e fuel_logs
ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS invoice_id uuid REFERENCES public.credit_card_invoices(id) ON DELETE SET NULL;

ALTER TABLE public.fuel_logs
ADD COLUMN IF NOT EXISTS invoice_id uuid REFERENCES public.credit_card_invoices(id) ON DELETE SET NULL;

-- 4) Função para calcular closing_date (pura, sem auth)
CREATE OR REPLACE FUNCTION public.compute_closing_date(
  p_tx_date date,
  p_closing_day int
) RETURNS date
LANGUAGE plpgsql
AS $$
DECLARE
  v_month_start date;
  v_last_day date;
  v_day int;
  v_closing_this date;
  v_next_month date;
  v_next_last date;
  v_next_day int;
BEGIN
  v_month_start := date_trunc('month', p_tx_date)::date;
  v_last_day := (v_month_start + interval '1 month - 1 day')::date;
  v_day := least(p_closing_day, extract(day from v_last_day)::int);
  v_closing_this := (v_month_start + (v_day - 1))::date;

  IF p_tx_date <= v_closing_this THEN
    RETURN v_closing_this;
  END IF;

  v_next_month := (v_month_start + interval '1 month')::date;
  v_next_last := (v_next_month + interval '1 month - 1 day')::date;
  v_next_day := least(p_closing_day, extract(day from v_next_last)::int);

  RETURN (v_next_month + (v_next_day - 1))::date;
END;
$$;

-- 5) Função para BACKFILL (aceita user_id explícito)
CREATE OR REPLACE FUNCTION public.resolve_or_create_invoice_for_user(
  p_user_id uuid,
  p_credit_card_id uuid,
  p_tx_date date
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_closing_day int;
  v_due_day int;
  v_due_offset int;
  v_closing_date date;
  v_prev_closing date;
  v_period_start date;
  v_period_end date;
  v_due_base_month date;
  v_due_last date;
  v_due_day_adj int;
  v_due_date date;
  v_invoice_id uuid;
BEGIN
  -- Valida que o cartão pertence ao usuário
  SELECT closing_day, due_day, COALESCE(due_month_offset, 1)
  INTO v_closing_day, v_due_day, v_due_offset
  FROM public.credit_cards
  WHERE id = p_credit_card_id
    AND user_id = p_user_id;

  IF v_closing_day IS NULL OR v_due_day IS NULL THEN
    RAISE EXCEPTION 'Cartão não encontrado ou sem configuração de fechamento/vencimento para este usuário';
  END IF;

  v_closing_date := public.compute_closing_date(p_tx_date, v_closing_day);

  v_prev_closing := public.compute_closing_date((v_closing_date - interval '1 month')::date, v_closing_day);
  v_period_start := (v_prev_closing + 1);
  v_period_end := v_closing_date;

  v_due_base_month := date_trunc('month', (v_closing_date + (v_due_offset || ' month')::interval))::date;
  v_due_last := (v_due_base_month + interval '1 month - 1 day')::date;
  v_due_day_adj := least(v_due_day, extract(day from v_due_last)::int);
  v_due_date := (v_due_base_month + (v_due_day_adj - 1))::date;

  INSERT INTO public.credit_card_invoices (
    user_id, credit_card_id, closing_date, period_start, period_end, due_date
  ) VALUES (
    p_user_id, p_credit_card_id, v_closing_date, v_period_start, v_period_end, v_due_date
  )
  ON CONFLICT (credit_card_id, closing_date)
  DO UPDATE SET
    period_start = EXCLUDED.period_start,
    period_end   = EXCLUDED.period_end,
    due_date     = EXCLUDED.due_date
  RETURNING id INTO v_invoice_id;

  RETURN v_invoice_id;
END;
$$;

-- 6) Função DO APP (wrapper com auth.uid)
CREATE OR REPLACE FUNCTION public.resolve_or_create_invoice(
  p_credit_card_id uuid,
  p_tx_date date
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.resolve_or_create_invoice_for_user(auth.uid(), p_credit_card_id, p_tx_date);
END;
$$;

-- 7) Função para recalcular total de uma fatura
CREATE OR REPLACE FUNCTION public.recalculate_invoice_total(p_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total numeric;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_total
  FROM (
    SELECT amount FROM public.expenses WHERE invoice_id = p_invoice_id
    UNION ALL
    SELECT total_value FROM public.fuel_logs WHERE invoice_id = p_invoice_id
  ) sub;

  UPDATE public.credit_card_invoices
  SET total_amount = v_total, updated_at = now()
  WHERE id = p_invoice_id;
END;
$$;

-- 8) Backfill: vincular expenses existentes com cartão às faturas
UPDATE public.expenses e
SET invoice_id = public.resolve_or_create_invoice_for_user(e.user_id, e.credit_card_id, e.date)
WHERE e.credit_card_id IS NOT NULL
  AND e.invoice_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.credit_cards c 
    WHERE c.id = e.credit_card_id 
      AND c.user_id = e.user_id
      AND c.closing_day IS NOT NULL 
      AND c.due_day IS NOT NULL
  );

-- 9) Backfill: vincular fuel_logs existentes com cartão às faturas
UPDATE public.fuel_logs f
SET invoice_id = public.resolve_or_create_invoice_for_user(f.user_id, f.credit_card_id, f.date)
WHERE f.credit_card_id IS NOT NULL
  AND f.invoice_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.credit_cards c 
    WHERE c.id = f.credit_card_id 
      AND c.user_id = f.user_id
      AND c.closing_day IS NOT NULL 
      AND c.due_day IS NOT NULL
  );

-- 10) Recalcular totais de todas as faturas
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.credit_card_invoices LOOP
    PERFORM public.recalculate_invoice_total(r.id);
  END LOOP;
END;
$$;
