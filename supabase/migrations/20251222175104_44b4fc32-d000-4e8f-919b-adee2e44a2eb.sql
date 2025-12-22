-- Remove system expense categories that shouldn't exist
DELETE FROM expense_categories WHERE key IN ('cartao', 'outro') AND is_system = true AND user_id IS NULL;

-- Add missing "Elétrico" expense category (only if not exists)
INSERT INTO expense_categories (key, name, color, is_system, is_default, is_active, user_id)
SELECT 'eletrico', 'Elétrico', '#27AE60', true, false, true, NULL
WHERE NOT EXISTS (SELECT 1 FROM expense_categories WHERE key = 'eletrico' AND user_id IS NULL);

-- Remove system platform "Outro" that shouldn't exist
DELETE FROM platforms WHERE key = 'other' AND user_id IS NULL;

-- Add missing platform "Particular" (only if not exists)
INSERT INTO platforms (key, name, color, is_default, is_active, is_other, user_id)
SELECT 'particular', 'Particular', '#3498DB', false, true, false, NULL
WHERE NOT EXISTS (SELECT 1 FROM platforms WHERE key = 'particular' AND user_id IS NULL);

-- Add missing platform "Lojinha" (only if not exists)
INSERT INTO platforms (key, name, color, is_default, is_active, is_other, user_id)
SELECT 'lojinha', 'Lojinha', '#9B59B6', false, true, false, NULL
WHERE NOT EXISTS (SELECT 1 FROM platforms WHERE key = 'lojinha' AND user_id IS NULL);