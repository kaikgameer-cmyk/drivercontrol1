
-- Corrigir search_path na função compute_closing_date
CREATE OR REPLACE FUNCTION public.compute_closing_date(
  p_tx_date date,
  p_closing_day int
) RETURNS date
LANGUAGE plpgsql
SET search_path = public
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

-- Revogar permissão da função interna para usuários normais (boa prática pós-backfill)
REVOKE ALL ON FUNCTION public.resolve_or_create_invoice_for_user(uuid, uuid, date) FROM anon, authenticated;
