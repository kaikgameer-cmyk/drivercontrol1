-- Strengthen password_tokens storage and RLS + add hashed tokens and consume function

-- 1) Add hashed token columns (non-breaking initial add)
ALTER TABLE public.password_tokens
  ADD COLUMN IF NOT EXISTS token_hash text,
  ADD COLUMN IF NOT EXISTS token_preview text;

-- 2) Backfill hash + preview from existing plaintext tokens (one-time)
UPDATE public.password_tokens
SET
  token_hash = COALESCE(
    token_hash,
    encode(extensions.digest(token::text, 'sha256'), 'hex')
  ),
  token_preview = COALESCE(
    token_preview,
    CASE
      WHEN length(token::text) >= 6 THEN right(token::text, 6)
      WHEN token IS NOT NULL THEN token::text
      ELSE NULL
    END
  )
WHERE token IS NOT NULL;

-- 3) Enforce NOT NULL on token_hash for new/updated rows
ALTER TABLE public.password_tokens
  ALTER COLUMN token_hash SET NOT NULL;

-- Optional hardening: ensure token_hash uniqueness to prevent duplicates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_indexes
    WHERE  schemaname = 'public'
    AND    tablename = 'password_tokens'
    AND    indexname = 'password_tokens_token_hash_key'
  ) THEN
    ALTER TABLE public.password_tokens
      ADD CONSTRAINT password_tokens_token_hash_key UNIQUE (token_hash);
  END IF;
END $$;

-- 4) Tighten RLS policies on password_tokens to avoid OR-bypass
ALTER TABLE public.password_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No public access to password tokens" ON public.password_tokens;
DROP POLICY IF EXISTS "Service role can manage password tokens" ON public.password_tokens;

-- Restrictive deny-all policy for normal contexts
CREATE POLICY "No public access to password tokens"
ON public.password_tokens
AS RESTRICTIVE
FOR SELECT
USING (false);

-- Explicit allow only for service_role (mainly for diagnostics if ever used without built-in bypass)
CREATE POLICY "Service role can manage password tokens"
ON public.password_tokens
FOR ALL
USING ((current_setting('request.jwt.claims', true)::json->>'role')::text = 'service_role')
WITH CHECK ((current_setting('request.jwt.claims', true)::json->>'role')::text = 'service_role');

-- 5) Revoke direct table privileges from anon/authenticated; all access must go through service role or SECURITY DEFINER
REVOKE ALL ON public.password_tokens FROM anon;
REVOKE ALL ON public.password_tokens FROM authenticated;

-- 6) SECURITY DEFINER function to consume password tokens by hash only
CREATE OR REPLACE FUNCTION public.consume_password_token(p_token text, p_type text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_hash text;
  v_row public.password_tokens%ROWTYPE;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) = 0 THEN
    RAISE EXCEPTION 'Invalid token';
  END IF;

  v_hash := encode(extensions.digest(p_token::text, 'sha256'), 'hex');

  SELECT * INTO v_row
  FROM public.password_tokens
  WHERE token_hash = v_hash
    AND type = p_type
    AND expires_at > now()
    AND used_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired token';
  END IF;

  UPDATE public.password_tokens
  SET used_at = now()
  WHERE id = v_row.id;

  RETURN v_row.user_id;
END;
$$;

-- 7) Optional defense-in-depth: make competition_results explicitly read-only for clients
ALTER TABLE public.competition_results ENABLE ROW LEVEL SECURITY;

-- Clean up any legacy write policies if present
DROP POLICY IF EXISTS "Competition results insert" ON public.competition_results;
DROP POLICY IF EXISTS "Competition results update" ON public.competition_results;
DROP POLICY IF EXISTS "Competition results delete" ON public.competition_results;

-- Explicitly deny direct writes; all mutations must go through finalize_competition* functions
CREATE POLICY "No direct writes to competition results"
ON public.competition_results
FOR INSERT
WITH CHECK (false);

CREATE POLICY "No direct updates to competition results"
ON public.competition_results
FOR UPDATE
USING (false);

CREATE POLICY "No direct deletes to competition results"
ON public.competition_results
FOR DELETE
USING (false);
