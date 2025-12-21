
-- Drop and recreate the function with corrected status logic
CREATE OR REPLACE FUNCTION public.get_competitions_for_tabs()
 RETURNS TABLE(id uuid, name text, description text, start_date date, end_date date, prize_value numeric, goal_value numeric, allow_teams boolean, host_user_id uuid, participants_count bigint, user_is_member boolean, user_is_host boolean, computed_status text, computed_label text, meta_reached boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  local_now timestamp;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  -- Get current time in São Paulo timezone
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
      -- Calculate date_status using proper end of day logic (23:59:59.999999)
      -- end_date + 1 day at 00:00:00 means competition ended at 23:59:59 of end_date
      CASE
        WHEN EXISTS (SELECT 1 FROM competition_results cr WHERE cr.competition_id = c.id) THEN 'finished'
        WHEN local_now >= ((c.end_date + INTERVAL '1 day')::timestamp) THEN 'finished'
        WHEN local_now < (c.start_date::timestamp) THEN 'future'
        ELSE 'running'
      END AS date_status
    FROM competitions c
    WHERE 
      c.deleted_at IS NULL
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
    -- FIXED: computed_status logic
    -- 'finished' = competition ended (now > end_date 23:59:59)
    -- 'mine' = user is member or host AND competition NOT finished
    -- 'available' = user is NOT member, competition is listed, NOT finished, has space
    CASE
      WHEN cd.date_status = 'finished' THEN 'finished'::text
      WHEN cd.user_is_member OR cd.user_is_host THEN 'mine'::text
      WHEN cd.is_listed = true 
           AND (cd.date_status = 'future' OR cd.date_status = 'running')
           AND (cd.max_members IS NULL OR cd.participants_count < cd.max_members) THEN 'available'::text
      ELSE 'unavailable'::text  -- Not listed, not member, not host
    END AS computed_status,
    -- computed_label: human-readable status
    CASE
      WHEN cd.date_status = 'finished' THEN 'Finalizada'
      WHEN cd.date_status = 'future' AND (cd.user_is_member OR cd.user_is_host) THEN 'Aguardando início'
      WHEN cd.date_status = 'future' THEN 'Participe agora'
      WHEN cd.date_status = 'running' THEN 'Em andamento'
      ELSE 'Finalizada'
    END AS computed_label,
    COALESCE(cd.result_meta_reached, false) AS meta_reached
  FROM competition_data cd
  WHERE 
    -- Filter out 'unavailable' from results
    NOT (
      cd.date_status != 'finished'
      AND NOT cd.user_is_member 
      AND NOT cd.user_is_host 
      AND cd.is_listed = false
    )
  ORDER BY 
    CASE 
      WHEN cd.date_status = 'running' THEN 1
      WHEN cd.date_status = 'future' THEN 2
      ELSE 3
    END,
    cd.start_date ASC,
    cd.end_date DESC;
END;
$function$;
