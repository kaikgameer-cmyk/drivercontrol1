-- Add restrictive SELECT policy to prevent public access to password tokens
-- Only service role (via edge functions) should be able to access this table

CREATE POLICY "No public access to password tokens"
ON public.password_tokens
FOR SELECT
USING (false);