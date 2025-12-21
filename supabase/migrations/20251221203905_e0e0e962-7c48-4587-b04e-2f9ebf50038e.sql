-- RPC: Resolve competition ID by code (for legacy URLs)
create or replace function public.get_competition_id_by_code(p_code text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.id
  from public.competitions c
  where c.deleted_at is null
    and upper(c.code) = upper(p_code)
  limit 1;
$$;

grant execute on function public.get_competition_id_by_code(text) to authenticated;

-- RPC: Single payload for competition details page
create or replace function public.get_competition_page(p_competition_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_now_sp timestamp := (now() at time zone 'America/Sao_Paulo');

  v_comp record;
  v_is_host boolean := false;
  v_is_member boolean := false;
  v_participants_count integer := 0;

  v_start_ts timestamp;
  v_end_ts timestamp;

  v_is_started boolean := false;
  v_is_finalized boolean := false;
  v_is_joinable boolean := false;

  v_members jsonb := '[]'::jsonb;
  v_all_members jsonb := '[]'::jsonb;
  v_teams jsonb := null;
  v_leaderboard jsonb := null;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select
    c.id,
    c.code,
    c.name,
    c.description,
    c.goal_type,
    c.goal_value,
    c.prize_value,
    c.start_date,
    c.end_date,
    c.max_members,
    c.allow_teams,
    c.team_size,
    c.created_by,
    c.is_listed,
    c.deleted_at,
    (select cr.finished_at from public.competition_results cr where cr.competition_id = c.id) as finished_at
  into v_comp
  from public.competitions c
  where c.id = p_competition_id
    and c.deleted_at is null;

  if v_comp is null then
    return null;
  end if;

  v_is_host := (v_comp.created_by = v_user_id);

  select exists(
    select 1
    from public.competition_members cm
    where cm.competition_id = v_comp.id
      and cm.user_id = v_user_id
  ) into v_is_member;

  -- Security: only expose page for listed comps OR members/host
  if not v_comp.is_listed and not v_is_host and not v_is_member then
    return null;
  end if;

  select count(*)::int
  into v_participants_count
  from public.competition_members cm
  where cm.competition_id = v_comp.id;

  -- Period boundaries (America/Sao_Paulo, based on dates)
  v_start_ts := (v_comp.start_date::timestamp); -- 00:00:00
  v_end_ts := ((v_comp.end_date + interval '1 day')::timestamp - interval '1 second'); -- 23:59:59

  v_is_started := v_now_sp >= v_start_ts;
  v_is_finalized := (v_now_sp > v_end_ts) or (v_comp.finished_at is not null);
  v_is_joinable := (v_comp.is_listed = true)
                   and (v_now_sp <= v_end_ts)
                   and (v_comp.max_members is null or v_participants_count < v_comp.max_members);

  -- Build leaderboard only for host/member
  if v_is_host or v_is_member then
    -- Individual leaderboard
    select coalesce(jsonb_agg(member_data order by (member_data->>'score')::numeric desc), '[]'::jsonb)
    into v_members
    from (
      select jsonb_build_object(
        'user_id', cm.user_id,
        'display_name', coalesce(p.name, 'Usuário'),
        'role', cm.role,
        'is_competitor', cm.is_competitor,
        'total_income', coalesce(income.total, 0),
        'score', coalesce(income.total, 0),
        'progress', case
          when v_comp.goal_value > 0 then round(coalesce(income.total, 0) / v_comp.goal_value * 100, 1)
          else 0
        end
      ) as member_data
      from public.competition_members cm
      left join public.profiles p on p.user_id = cm.user_id
      left join lateral (
        select sum(idi.amount) as total
        from public.income_days id
        join public.income_day_items idi on idi.income_day_id = id.id
        where id.user_id = cm.user_id
          and id.date >= v_comp.start_date
          and id.date <= v_comp.end_date
      ) income on true
      where cm.competition_id = v_comp.id
        and cm.is_competitor = true
    ) t;

    -- All members (for team management UI)
    select coalesce(jsonb_agg(jsonb_build_object(
      'user_id', cm.user_id,
      'display_name', coalesce(p.name, 'Usuário'),
      'role', cm.role,
      'is_competitor', cm.is_competitor
    ) order by cm.joined_at asc), '[]'::jsonb)
    into v_all_members
    from public.competition_members cm
    left join public.profiles p on p.user_id = cm.user_id
    where cm.competition_id = v_comp.id;

    -- Team leaderboard (only if allow_teams)
    if v_comp.allow_teams then
      select coalesce(jsonb_agg(team_data order by (team_data->>'team_score')::numeric desc), '[]'::jsonb)
      into v_teams
      from (
        select jsonb_build_object(
          'team_id', ct.id,
          'team_name', ct.name,
          'team_score', coalesce(sum(coalesce(income.total, 0)), 0),
          'members', coalesce(
            jsonb_agg(
              jsonb_build_object(
                'user_id', ctm.user_id,
                'display_name', coalesce(p.name, 'Usuário')
              )
              order by coalesce(p.name, 'Usuário')
            ) filter (where ctm.user_id is not null),
            '[]'::jsonb
          )
        ) as team_data
        from public.competition_teams ct
        left join public.competition_team_members ctm on ctm.team_id = ct.id
        left join public.profiles p on p.user_id = ctm.user_id
        left join public.competition_members cm on cm.competition_id = ct.competition_id and cm.user_id = ctm.user_id
        left join lateral (
          select sum(idi.amount) as total
          from public.income_days id
          join public.income_day_items idi on idi.income_day_id = id.id
          where id.user_id = ctm.user_id
            and id.date >= v_comp.start_date
            and id.date <= v_comp.end_date
        ) income on true
        where ct.competition_id = v_comp.id
          and (cm.is_competitor = true or cm.is_competitor is null)
        group by ct.id, ct.name
      ) s;
    else
      v_teams := null;
    end if;

    v_leaderboard := jsonb_build_object(
      'members', v_members,
      'all_members', v_all_members,
      'teams', v_teams
    );
  end if;

  return jsonb_build_object(
    'competition', jsonb_build_object(
      'id', v_comp.id,
      'code', v_comp.code,
      'name', v_comp.name,
      'description', v_comp.description,
      'goal_type', v_comp.goal_type,
      'goal_value', v_comp.goal_value,
      'prize_value', v_comp.prize_value,
      'start_date', v_comp.start_date,
      'end_date', v_comp.end_date,
      'max_members', v_comp.max_members,
      'allow_teams', v_comp.allow_teams,
      'team_size', v_comp.team_size,
      'host_user_id', v_comp.created_by,
      'participants_count', v_participants_count
    ),
    'my_membership', jsonb_build_object(
      'is_host', v_is_host,
      'is_member', v_is_member
    ),
    'leaderboard', v_leaderboard,
    'flags', jsonb_build_object(
      'is_started', v_is_started,
      'is_finalized', v_is_finalized,
      'is_joinable', v_is_joinable
    )
  );
end;
$$;

grant execute on function public.get_competition_page(uuid) to authenticated;
