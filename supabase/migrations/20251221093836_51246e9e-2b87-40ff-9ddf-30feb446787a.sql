-- Add transparency acceptance columns to competition_members
ALTER TABLE public.competition_members
  ADD COLUMN IF NOT EXISTS transparency_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS transparency_accepted_at timestamptz NULL;

-- Update join_competition to create members as non-competitors until transparency is accepted
CREATE OR REPLACE FUNCTION public.join_competition(
  p_code text,
  p_password text,
  p_pix_key text DEFAULT NULL::text,
  p_pix_key_type text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_competition record;
  v_member_count integer;
  v_pix text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate PIX key
  v_pix := NULLIF(TRIM(COALESCE(p_pix_key, '')), '');
  IF v_pix IS NULL OR length(v_pix) < 5 THEN
    RAISE EXCEPTION 'Chave PIX é obrigatória (mínimo 5 caracteres)';
  END IF;

  -- Find competition and validate password
  SELECT id, max_members, password_hash, name
  INTO v_competition
  FROM public.competitions
  WHERE code = UPPER(p_code)
    AND password_hash = extensions.crypt(p_password, password_hash);

  IF v_competition IS NULL THEN
    RAISE EXCEPTION 'Código ou senha inválidos';
  END IF;

  -- Check if already member
  IF EXISTS (
    SELECT 1 FROM public.competition_members
    WHERE competition_id = v_competition.id AND user_id = v_user_id
  ) THEN
    -- Update PIX if already member
    UPDATE public.competition_members
    SET pix_key = v_pix,
        pix_key_type = p_pix_key_type,
        pix_updated_at = now()
    WHERE competition_id = v_competition.id AND user_id = v_user_id;

    RETURN jsonb_build_object(
      'competition_id', v_competition.id,
      'name', v_competition.name,
      'message', 'already_member'
    );
  END IF;

  -- Check max members
  IF v_competition.max_members IS NOT NULL THEN
    SELECT COUNT(*) INTO v_member_count
    FROM public.competition_members
    WHERE competition_id = v_competition.id;

    IF v_member_count >= v_competition.max_members THEN
      RAISE EXCEPTION 'Competição lotada';
    END IF;
  END IF;

  -- Add member with is_competitor=false until transparency is accepted
  INSERT INTO public.competition_members (
    competition_id,
    user_id,
    role,
    is_competitor,
    pix_key,
    pix_key_type,
    pix_updated_at,
    transparency_accepted,
    transparency_accepted_at
  ) VALUES (
    v_competition.id,
    v_user_id,
    'member',
    false,
    v_pix,
    p_pix_key_type,
    now(),
    false,
    NULL
  );

  RETURN jsonb_build_object(
    'competition_id', v_competition.id,
    'name', v_competition.name,
    'message', 'joined'
  );
END;
$$;