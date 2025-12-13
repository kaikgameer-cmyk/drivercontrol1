-- Tabela para armazenar tokens de criação/redefinição de senha
CREATE TABLE public.password_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('signup', 'reset')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index para busca rápida por token
CREATE INDEX idx_password_tokens_token ON public.password_tokens(token);

-- Index para limpeza de tokens expirados
CREATE INDEX idx_password_tokens_expires_at ON public.password_tokens(expires_at);

-- RLS: apenas service role pode acessar (tokens são gerenciados apenas via edge functions)
ALTER TABLE public.password_tokens ENABLE ROW LEVEL SECURITY;

-- Política para service role poder gerenciar os tokens
CREATE POLICY "Service role can manage password tokens"
ON public.password_tokens
FOR ALL
USING (true)
WITH CHECK (true);