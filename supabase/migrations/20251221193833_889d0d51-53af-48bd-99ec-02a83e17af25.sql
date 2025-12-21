-- RPC for fast competitions listing across tabs
CREATE OR REPLACE FUNCTION public.get_competitions_for_tabs()
RETURNS TABLE (
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
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH cu AS (
    SELECT auth.uid() AS user_id
  ),
  ctx AS (
    SELECT
      user_id,
      (now() AT TIME ZONE 'America/Sao_Paulo')::date AS today_sp
    FROM cu
  ),
  member_flags AS (
    SELECT DISTINCT
      cm.competition_id,
      cm.user_id
    FROM public.competition_members cm
  ),
  participant_counts AS (
    SELECT
      cm.competition_id,
      COUNT(*) AS participants_count
    FROM public.competition_members cm
    GROUP BY cm.competition_id
  )
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
    COALESCE(pc.participants_count, 0) AS participants_count,
    COALESCE(uf.user_id IS NOT NULL, false) AS user_is_member,
    (c.created_by = ctx.user_id) AS user_is_host,
    -- computed_status: 'available' | 'mine' | 'finished'
    CASE
      WHEN cr.finished_at IS NOT NULL
        OR (c.end_date + INTERVAL '1 day')::date <= ctx.today_sp
        THEN 'finished'
      WHEN COALESCE(uf.user_id IS NOT NULL, false) OR c.created_by = ctx.user_id
        THEN 'mine'
      ELSE 'available'
    END AS computed_status,
    -- computed_label: 'Participe agora' | 'Começa em breve' | 'Em andamento' | 'Finalizada'
    CASE
      WHEN cr.finished_at IS NOT NULL
        OR (c.end_date + INTERVAL '1 day')::date <= ctx.today_sp
        THEN 'Finalizada'
      WHEN ctx.today_sp < c.start_date
        THEN 'Começa em breve'
      ELSE 'Em andamento'
    END AS computed_label,
    COALESCE(cr.meta_reached, false) AS meta_reached
  FROM ctx
  JOIN public.competitions c ON TRUE
  LEFT JOIN participant_counts pc ON pc.competition_id = c.id
  LEFT JOIN member_flags uf ON uf.competition_id = c.id AND uf.user_id = ctx.user_id
  LEFT JOIN public.competition_results cr ON cr.competition_id = c.id
  WHERE ctx.user_id IS NOT NULL
    AND (
      c.created_by = ctx.user_id
      OR EXISTS (
        SELECT 1
        FROM public.competition_members cm2
        WHERE cm2.competition_id = c.id
          AND cm2.user_id = ctx.user_id
      )
      OR c.is_listed = TRUE
    );
$function$;