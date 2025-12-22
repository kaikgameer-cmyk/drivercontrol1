-- Create expense_categories table (similar to platforms but for expenses)
CREATE TABLE public.expense_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#EF4444',
  icon TEXT DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  user_id UUID DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add unique constraint for key per user (system categories have null user_id)
CREATE UNIQUE INDEX expense_categories_key_user_idx ON public.expense_categories (key, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'));

-- Enable RLS
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

-- Users can read system categories (user_id IS NULL) and their own categories
CREATE POLICY "Users can read system and own categories"
ON public.expense_categories
FOR SELECT
USING (
  (user_id IS NULL AND is_active = true) OR 
  user_id = auth.uid()
);

-- Users can insert their own categories
CREATE POLICY "Users can insert own categories"
ON public.expense_categories
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own categories
CREATE POLICY "Users can update own categories"
ON public.expense_categories
FOR UPDATE
USING (user_id = auth.uid());

-- Users can delete their own categories
CREATE POLICY "Users can delete own categories"
ON public.expense_categories
FOR DELETE
USING (user_id = auth.uid());

-- Create user_expense_categories table to track which categories are enabled per user
CREATE TABLE public.user_expense_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, category_key)
);

-- Enable RLS
ALTER TABLE public.user_expense_categories ENABLE ROW LEVEL SECURITY;

-- Users can view own preferences
CREATE POLICY "Users can view own category preferences"
ON public.user_expense_categories
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert own preferences
CREATE POLICY "Users can insert own category preferences"
ON public.user_expense_categories
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update own preferences
CREATE POLICY "Users can update own category preferences"
ON public.user_expense_categories
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete own preferences
CREATE POLICY "Users can delete own category preferences"
ON public.user_expense_categories
FOR DELETE
USING (auth.uid() = user_id);

-- Insert default system categories
INSERT INTO public.expense_categories (key, name, color, is_system, user_id) VALUES
  ('combustivel', 'Combustível', '#F97316', true, NULL),
  ('manutencao', 'Manutenção', '#3B82F6', true, NULL),
  ('lavagem', 'Lavagem', '#06B6D4', true, NULL),
  ('pedagio', 'Pedágio', '#8B5CF6', true, NULL),
  ('estacionamento', 'Estacionamento', '#EC4899', true, NULL),
  ('alimentacao', 'Alimentação', '#22C55E', true, NULL),
  ('cartao', 'Cartão de Crédito', '#EAB308', true, NULL),
  ('outro', 'Outro', '#6B7280', true, NULL);