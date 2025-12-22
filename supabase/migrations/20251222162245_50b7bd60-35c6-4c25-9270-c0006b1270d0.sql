-- Create fixed_bills table for recurring fixed expenses configuration
CREATE TABLE public.fixed_bills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  due_day INTEGER CHECK (due_day >= 1 AND due_day <= 31),
  recurrence TEXT NOT NULL DEFAULT 'monthly',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bills_instances table for monthly instances of fixed bills
CREATE TABLE public.bills_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  fixed_bill_id UUID NOT NULL REFERENCES public.fixed_bills(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL, -- Format: YYYY-MM
  due_date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(fixed_bill_id, month_year)
);

-- Enable RLS
ALTER TABLE public.fixed_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills_instances ENABLE ROW LEVEL SECURITY;

-- RLS policies for fixed_bills
CREATE POLICY "Users can view own fixed bills" 
ON public.fixed_bills 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fixed bills" 
ON public.fixed_bills 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fixed bills" 
ON public.fixed_bills 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own fixed bills" 
ON public.fixed_bills 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for bills_instances
CREATE POLICY "Users can view own bill instances" 
ON public.bills_instances 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bill instances" 
ON public.bills_instances 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bill instances" 
ON public.bills_instances 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bill instances" 
ON public.bills_instances 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_fixed_bills_user_id ON public.fixed_bills(user_id);
CREATE INDEX idx_fixed_bills_is_active ON public.fixed_bills(is_active);
CREATE INDEX idx_bills_instances_user_id ON public.bills_instances(user_id);
CREATE INDEX idx_bills_instances_fixed_bill_id ON public.bills_instances(fixed_bill_id);
CREATE INDEX idx_bills_instances_month_year ON public.bills_instances(month_year);
CREATE INDEX idx_bills_instances_due_date ON public.bills_instances(due_date);

-- Trigger for updated_at on fixed_bills
CREATE TRIGGER update_fixed_bills_updated_at
BEFORE UPDATE ON public.fixed_bills
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on bills_instances
CREATE TRIGGER update_bills_instances_updated_at
BEFORE UPDATE ON public.bills_instances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();