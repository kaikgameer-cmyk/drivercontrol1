-- Add deleted_at column for soft delete
ALTER TABLE public.competitions
ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

-- Index for filtering active competitions
CREATE INDEX IF NOT EXISTS idx_competitions_deleted_at ON public.competitions(deleted_at) WHERE deleted_at IS NULL;

-- Update the get_competitions_for_tabs function to filter out deleted competitions
CREATE OR REPLACE FUNCTION public.get_competitions_for_tabs()
RETURNS TABLE(
  id uuid, 
  name text, 
  description text, 
  start_date date, 
  end_date date, 
  prize_value numeric, 
  goal_value numeric, 
  allow_teams boolean, 
  host_user_id uuid, 
  participants_count bigint, 
  user_is_member boolean, 
  user_is_host boolean, 
  computed_status text, 
  computed_label text, 
  meta_reached boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  local_now timestamp;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  local_now := (now() AT TIME ZONE 'America/Sao_Paulo');
  
  RETURN QUERY
  WITH competition_data AS (
    SELECT 
      c.id,
      c.name,
      c.description,
      c.start_date,
      c.end_date,
      c.prize_value,
      c.goal_value,
      c.allow_teams,
      c.created_by AS host_user_id,
      c.is_listed,
      c.max_members,
      (SELECT COUNT(*) FROM competition_members cm WHERE cm.competition_id = c.id) AS participants_count,
      EXISTS (
        SELECT 1 FROM competition_members cm 
        WHERE cm.competition_id = c.id AND cm.user_id = current_user_id
      ) AS user_is_member,
      (c.created_by = current_user_id) AS user_is_host,
      (SELECT cr.meta_reached FROM competition_results cr WHERE cr.competition_id = c.id) AS result_meta_reached,
      (SELECT cr.finished_at FROM competition_results cr WHERE cr.competition_id = c.id) AS finished_at,
      CASE
        WHEN EXISTS (SELECT 1 FROM competition_results cr WHERE cr.competition_id = c.id) THEN 'finished'
        WHEN local_now >= ((c.end_date + INTERVAL '1 day')::timestamp) THEN 'finished'
        WHEN local_now < (c.start_date::timestamp) THEN 'future'
        ELSE 'running'
      END AS date_status
    FROM competitions c
    WHERE 
      c.deleted_at IS NULL -- Filter out soft-deleted competitions
      AND (
        c.created_by = current_user_id
        OR EXISTS (SELECT 1 FROM competition_members cm WHERE cm.competition_id = c.id AND cm.user_id = current_user_id)
        OR c.is_listed = true
      )
  )
  SELECT 
    cd.id,
    cd.name,
    cd.description,
    cd.start_date,
    cd.end_date,
    cd.prize_value,
    cd.goal_value,
    cd.allow_teams,
    cd.host_user_id,
    cd.participants_count,
    cd.user_is_member,
    cd.user_is_host,
    CASE
      WHEN cd.date_status = 'finished' THEN 'finished'
      WHEN cd.user_is_member OR cd.user_is_host THEN 'mine'
      WHEN cd.is_listed = true 
           AND cd.date_status != 'finished'
           AND (cd.max_members IS NULL OR cd.participants_count < cd.max_members) THEN 'available'
      ELSE 'mine'
    END AS computed_status,
    CASE
      WHEN cd.date_status = 'finished' THEN 'Finalizada'
      WHEN cd.date_status = 'future' AND (cd.user_is_member OR cd.user_is_host) THEN 'Aguardando início'
      WHEN cd.date_status = 'future' THEN 'Participe agora'
      WHEN cd.date_status = 'running' THEN 'Em andamento'
      ELSE 'Finalizada'
    END AS computed_label,
    COALESCE(cd.result_meta_reached, false) AS meta_reached
  FROM competition_data cd
  ORDER BY 
    CASE 
      WHEN cd.date_status = 'running' THEN 1
      WHEN cd.date_status = 'future' THEN 2
      ELSE 3
    END,
    cd.end_date DESC;
END;
$function$;

-- Update get_listed_competitions to filter deleted
CREATE OR REPLACE FUNCTION public.get_listed_competitions()
RETURNS TABLE(
  id uuid, 
  code text, 
  name text, 
  description text, 
  goal_value numeric, 
  prize_value numeric, 
  start_date date, 
  end_date date, 
  max_members integer, 
  allow_teams boolean, 
  member_count bigint, 
  is_member boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT 
    c.id,
    c.code,
    c.name,
    c.description,
    c.goal_value,
    c.prize_value,
    c.start_date,
    c.end_date,
    c.max_members,
    c.allow_teams,
    (SELECT COUNT(*) FROM competition_members cm WHERE cm.competition_id = c.id) as member_count,
    EXISTS (SELECT 1 FROM competition_members cm WHERE cm.competition_id = c.id AND cm.user_id = auth.uid()) as is_member
  FROM competitions c
  WHERE c.is_listed = true AND c.deleted_at IS NULL
  ORDER BY c.created_at DESC;
$function$;

-- RPC: Update competition as host
CREATE OR REPLACE FUNCTION public.update_competition_as_host(
  p_competition_id uuid,
  p_name text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_goal_value numeric DEFAULT NULL,
  p_prize_value numeric DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_max_members integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_competition record;
  v_current_count int;
  v_local_now timestamp;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- Get competition and verify host
  SELECT * INTO v_competition
  FROM public.competitions
  WHERE id = p_competition_id AND deleted_at IS NULL;

  IF v_competition IS NULL THEN
    RAISE EXCEPTION 'Competição não encontrada';
  END IF;

  IF v_competition.created_by != v_user_id THEN
    RAISE EXCEPTION 'Apenas o host pode editar a competição';
  END IF;

  -- Check if finished
  v_local_now := (now() AT TIME ZONE 'America/Sao_Paulo');
  IF v_local_now >= ((v_competition.end_date + INTERVAL '1 day')::timestamp) THEN
    RAISE EXCEPTION 'Não é possível editar uma competição finalizada';
  END IF;

  -- Validate dates if provided
  IF p_start_date IS NOT NULL AND p_end_date IS NOT NULL THEN
    IF p_end_date < p_start_date THEN
      RAISE EXCEPTION 'Data final não pode ser anterior à data inicial';
    END IF;
  ELSIF p_start_date IS NOT NULL AND p_end_date IS NULL THEN
    IF v_competition.end_date < p_start_date THEN
      RAISE EXCEPTION 'Data final não pode ser anterior à data inicial';
    END IF;
  ELSIF p_end_date IS NOT NULL AND p_start_date IS NULL THEN
    IF p_end_date < v_competition.start_date THEN
      RAISE EXCEPTION 'Data final não pode ser anterior à data inicial';
    END IF;
  END IF;

  -- Validate max_members if provided
  IF p_max_members IS NOT NULL THEN
    SELECT COUNT(*) INTO v_current_count
    FROM public.competition_members
    WHERE competition_id = p_competition_id;

    IF p_max_members < v_current_count THEN
      RAISE EXCEPTION 'Não é possível reduzir o limite abaixo do número atual de participantes (%)' , v_current_count;
    END IF;
  END IF;

  -- Validate goal_value if provided
  IF p_goal_value IS NOT NULL AND p_goal_value <= 0 THEN
    RAISE EXCEPTION 'Meta deve ser maior que zero';
  END IF;

  -- Validate prize_value if provided
  IF p_prize_value IS NOT NULL AND p_prize_value < 0 THEN
    RAISE EXCEPTION 'Prêmio não pode ser negativo';
  END IF;

  -- Update competition
  UPDATE public.competitions
  SET
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    goal_value = COALESCE(p_goal_value, goal_value),
    prize_value = COALESCE(p_prize_value, prize_value),
    start_date = COALESCE(p_start_date, start_date),
    end_date = COALESCE(p_end_date, end_date),
    max_members = COALESCE(p_max_members, max_members),
    updated_at = now()
  WHERE id = p_competition_id;

  -- Return updated competition (without password_hash)
  RETURN (
    SELECT jsonb_build_object(
      'id', c.id,
      'code', c.code,
      'name', c.name,
      'description', c.description,
      'goal_value', c.goal_value,
      'prize_value', c.prize_value,
      'start_date', c.start_date,
      'end_date', c.end_date,
      'max_members', c.max_members,
      'allow_teams', c.allow_teams,
      'host_participates', c.host_participates
    )
    FROM public.competitions c
    WHERE c.id = p_competition_id
  );
END;
$function$;

-- RPC: Delete competition as host (soft delete)
CREATE OR REPLACE FUNCTION public.delete_competition_as_host(p_competition_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_competition record;
  v_deleted_members int;
  v_deleted_teams int;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- Get competition and verify host
  SELECT * INTO v_competition
  FROM public.competitions
  WHERE id = p_competition_id AND deleted_at IS NULL;

  IF v_competition IS NULL THEN
    RAISE EXCEPTION 'Competição não encontrada';
  END IF;

  IF v_competition.created_by != v_user_id THEN
    RAISE EXCEPTION 'Apenas o host pode excluir a competição';
  END IF;

  -- Delete team members first
  DELETE FROM public.competition_team_members
  WHERE team_id IN (
    SELECT id FROM public.competition_teams WHERE competition_id = p_competition_id
  );

  -- Delete teams
  DELETE FROM public.competition_teams
  WHERE competition_id = p_competition_id;
  GET DIAGNOSTICS v_deleted_teams = ROW_COUNT;

  -- Delete members
  DELETE FROM public.competition_members
  WHERE competition_id = p_competition_id;
  GET DIAGNOSTICS v_deleted_members = ROW_COUNT;

  -- Delete payouts
  DELETE FROM public.competition_payouts
  WHERE competition_id = p_competition_id;

  -- Delete results
  DELETE FROM public.competition_results
  WHERE competition_id = p_competition_id;

  -- Delete user popups
  DELETE FROM public.competition_user_popups
  WHERE competition_id = p_competition_id;

  -- Delete notifications
  DELETE FROM public.notifications
  WHERE competition_id = p_competition_id;

  -- Soft delete competition
  UPDATE public.competitions
  SET deleted_at = now(), updated_at = now()
  WHERE id = p_competition_id;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_members', v_deleted_members,
    'deleted_teams', v_deleted_teams,
    'competition_name', v_competition.name
  );
END;
$function$;