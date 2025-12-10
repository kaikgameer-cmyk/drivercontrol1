-- Add recurrence_type and recurrence_day columns to recurring_expenses table
ALTER TABLE public.recurring_expenses 
ADD COLUMN IF NOT EXISTS recurrence_type text NOT NULL DEFAULT 'monthly';

ALTER TABLE public.recurring_expenses 
ADD COLUMN IF NOT EXISTS recurrence_day integer;

-- Add comment explaining the columns
COMMENT ON COLUMN public.recurring_expenses.recurrence_type IS 'Type of recurrence: "single" for one-time expense on a specific date, "monthly" for monthly recurring expense';
COMMENT ON COLUMN public.recurring_expenses.recurrence_day IS 'Day of month for monthly recurrence (1-31). Only used when recurrence_type is "monthly"';