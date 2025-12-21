-- Ensure extensions schema exists and enable pgcrypto there
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Lock competitions to income-only goal type
ALTER TABLE public.competitions
  ALTER COLUMN goal_type SET DEFAULT 'income_goal';

UPDATE public.competitions
SET goal_type = 'income_goal'
WHERE goal_type IS DISTINCT FROM 'income_goal';

ALTER TABLE public.competitions
  DROP CONSTRAINT IF EXISTS competitions_goal_type_income_only;

ALTER TABLE public.competitions
  ADD CONSTRAINT competitions_goal_type_income_only
  CHECK (goal_type = 'income_goal');

-- Fix password hashing to use pgcrypto from extensions schema
CREATE OR REPLACE FUNCTION public.create_competition(
  p_name text,
  p_description text,
  p_goal_type text,
  p_goal_value numeric,
  p_start_date date,
  p_end_date date,
  p_password text,
  p_max_members integer DEFAULT NULL,
  p_allow_teams boolean DEFAULT false,
  p_team_size integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_code text;
  v_competition_id uuid;
  v_attempts integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Enforce income-only competitions
  IF p_goal_type IS NOT NULL AND p_goal_type <> 'income_goal' THEN
    RAISE EXCEPTION 'Tipo de meta inválido';
  END IF;

  -- Generate unique code
  LOOP
    v_code := public.generate_competition_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.competitions WHERE code = v_code);
    v_attempts := v_attempts + 1;
    IF v_attempts > 100 THEN
      RAISE EXCEPTION 'Could not generate unique code';
    END IF;
  END LOOP;

  -- Insert competition
  INSERT INTO public.competitions (
    code, created_by, name, description, goal_type, goal_value,
    start_date, end_date, password_hash, max_members, allow_teams, team_size
  ) VALUES (
    v_code, v_user_id, p_name, p_description, 'income_goal', p_goal_value,
    p_start_date, p_end_date,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    p_max_members, p_allow_teams, p_team_size
  )
  RETURNING id INTO v_competition_id;

  -- Add creator as host
  INSERT INTO public.competition_members (competition_id, user_id, role)
  VALUES (v_competition_id, v_user_id, 'host');

  RETURN jsonb_build_object(
    'competition_id', v_competition_id,
    'code', v_code
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.join_competition(
  p_code text,
  p_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_competition record;
  v_member_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
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
    RETURN jsonb_build_object(
      'competition_id', v_competition.id,
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

  -- Add member
  INSERT INTO public.competition_members (competition_id, user_id, role)
  VALUES (v_competition.id, v_user_id, 'member');

  RETURN jsonb_build_object(
    'competition_id', v_competition.id,
    'name', v_competition.name,
    'message', 'joined'
  );
END;
$$;