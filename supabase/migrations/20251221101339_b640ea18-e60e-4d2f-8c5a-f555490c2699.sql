CREATE OR REPLACE FUNCTION public.admin_simulate_competition_finish(p_competition_id uuid, p_meta_reached boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_admin boolean;
  v_competition record;
  v_winner_type text;
  v_winner_team_id uuid;
  v_winner_user_id uuid;
  v_winner_total numeric(12,2);
  v_meta_reached boolean := p_meta_reached;
  v_payout_per_winner numeric(12,2) := 0;
  v_winner_count int := 0;
  v_winners jsonb;
  v_winner_team_name text;
  v_result_exists boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- Only admins can run test simulations
  SELECT public.has_role(v_user_id, 'admin') INTO v_is_admin;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Apenas administradores podem executar testes de competição';
  END IF;

  -- Get competition
  SELECT * INTO v_competition
  FROM public.competitions
  WHERE id = p_competition_id;

  IF v_competition IS NULL THEN
    RAISE EXCEPTION 'Competição não encontrada';
  END IF;

  -- If already has result, return existing one (idempotent)
  SELECT EXISTS (
    SELECT 1 FROM public.competition_results WHERE competition_id = p_competition_id
  ) INTO v_result_exists;

  IF v_result_exists THEN
    RETURN (
      SELECT jsonb_build_object(
        'already_finalized', true,
        'winner_type', cr.winner_type,
        'winner_team_id', cr.winner_team_id,
        'winner_user_id', cr.winner_user_id,
        'winner_total', cr.winner_score,
        'meta_reached', cr.meta_reached
      )
      FROM public.competition_results cr
      WHERE cr.competition_id = p_competition_id
    );
  END IF;

  -- Determine winner based on team mode (same lógica de finalize_competition, mas sem checar data)
  IF v_competition.allow_teams AND EXISTS (SELECT 1 FROM public.competition_teams WHERE competition_id = p_competition_id) THEN
    SELECT ct.id, ct.name, COALESCE(SUM(idi.amount), 0)::numeric(12,2) as total_score
    INTO v_winner_team_id, v_winner_team_name, v_winner_total
    FROM public.competition_teams ct
    LEFT JOIN public.competition_team_members ctm ON ctm.team_id = ct.id
    LEFT JOIN public.competition_members cm ON cm.competition_id = ct.competition_id AND cm.user_id = ctm.user_id
    LEFT JOIN public.income_days id ON id.user_id = ctm.user_id 
      AND id.date >= v_competition.start_date 
      AND id.date <= v_competition.end_date
    LEFT JOIN public.income_day_items idi ON idi.income_day_id = id.id
    WHERE ct.competition_id = p_competition_id
      AND cm.is_competitor = true
    GROUP BY ct.id, ct.name
    ORDER BY total_score DESC
    LIMIT 1;

    IF v_meta_reached AND v_winner_team_id IS NOT NULL THEN
      v_winner_type := 'team';
      SELECT COUNT(*) INTO v_winner_count
      FROM public.competition_team_members ctm
      JOIN public.competition_members cm ON cm.competition_id = p_competition_id AND cm.user_id = ctm.user_id
      WHERE ctm.team_id = v_winner_team_id AND cm.is_competitor = true;
      
      IF v_winner_count > 0 THEN
        v_payout_per_winner := ROUND(v_competition.prize_value / v_winner_count, 2);
      END IF;
    ELSE
      v_winner_type := 'none';
      v_winner_team_id := NULL;
    END IF;
  ELSE
    SELECT cm.user_id, COALESCE(SUM(idi.amount), 0)::numeric(12,2) as total_score
    INTO v_winner_user_id, v_winner_total
    FROM public.competition_members cm
    LEFT JOIN public.income_days id ON id.user_id = cm.user_id 
      AND id.date >= v_competition.start_date 
      AND id.date <= v_competition.end_date
    LEFT JOIN public.income_day_items idi ON idi.income_day_id = id.id
    WHERE cm.competition_id = p_competition_id
      AND cm.is_competitor = true
    GROUP BY cm.user_id
    ORDER BY total_score DESC
    LIMIT 1;

    IF v_meta_reached AND v_winner_user_id IS NOT NULL THEN
      v_winner_type := 'individual';
      v_payout_per_winner := v_competition.prize_value;
      v_winner_count := 1;
    ELSE
      v_winner_type := 'none';
      v_winner_user_id := NULL;
    END IF;
  END IF;

  -- Store result
  INSERT INTO public.competition_results (
    competition_id, winner_type, winner_team_id, winner_user_id, winner_score,
    goal_value, prize_value, meta_reached
  ) VALUES (
    p_competition_id, v_winner_type, v_winner_team_id, v_winner_user_id, COALESCE(v_winner_total, 0),
    v_competition.goal_value, v_competition.prize_value, v_meta_reached
  );

  -- Create payouts for all members (similar à finalize_competition)
  IF v_meta_reached AND v_winner_type = 'team' THEN
    INSERT INTO public.competition_payouts (competition_id, user_id, team_id, payout_value, status)
    SELECT p_competition_id, ctm.user_id, v_winner_team_id, v_payout_per_winner, 'winner'
    FROM public.competition_team_members ctm
    JOIN public.competition_members cm ON cm.competition_id = p_competition_id AND cm.user_id = ctm.user_id
    WHERE ctm.team_id = v_winner_team_id AND cm.is_competitor = true
    ON CONFLICT (competition_id, user_id) DO NOTHING;

    INSERT INTO public.competition_payouts (competition_id, user_id, team_id, payout_value, status)
    SELECT p_competition_id, cm.user_id, ctm.team_id, 0, 'loser'
    FROM public.competition_members cm
    LEFT JOIN public.competition_team_members ctm ON ctm.user_id = cm.user_id 
      AND ctm.team_id IN (SELECT id FROM public.competition_teams WHERE competition_id = p_competition_id)
    WHERE cm.competition_id = p_competition_id
      AND cm.is_competitor = true
      AND NOT EXISTS (SELECT 1 FROM public.competition_payouts cp WHERE cp.competition_id = p_competition_id AND cp.user_id = cm.user_id)
    ON CONFLICT (competition_id, user_id) DO NOTHING;

  ELSIF v_meta_reached AND v_winner_type = 'individual' THEN
    INSERT INTO public.competition_payouts (competition_id, user_id, payout_value, status)
    VALUES (p_competition_id, v_winner_user_id, v_payout_per_winner, 'winner')
    ON CONFLICT (competition_id, user_id) DO NOTHING;

    INSERT INTO public.competition_payouts (competition_id, user_id, payout_value, status)
    SELECT p_competition_id, cm.user_id, 0, 'loser'
    FROM public.competition_members cm
    WHERE cm.competition_id = p_competition_id
      AND cm.is_competitor = true
      AND cm.user_id != v_winner_user_id
    ON CONFLICT (competition_id, user_id) DO NOTHING;

  ELSE
    INSERT INTO public.competition_payouts (competition_id, user_id, payout_value, status)
    SELECT p_competition_id, cm.user_id, 0, 'no_winner'
    FROM public.competition_members cm
    WHERE cm.competition_id = p_competition_id
      AND cm.is_competitor = true
    ON CONFLICT (competition_id, user_id) DO NOTHING;
  END IF;

  -- Create host notification (meta reached ou não), reutilizando estrutura de finalize_competition
  IF v_meta_reached THEN
    SELECT jsonb_agg(jsonb_build_object(
      'user_id', cp.user_id,
      'name', COALESCE(TRIM(CONCAT(p.first_name, ' ', p.last_name)), p.name, 'Usuário'),
      'whatsapp', p.whatsapp,
      'pix_key', cm.pix_key,
      'payout_value', cp.payout_value
    ))
    INTO v_winners
    FROM public.competition_payouts cp
    JOIN public.competition_members cm ON cm.competition_id = cp.competition_id AND cm.user_id = cp.user_id
    LEFT JOIN public.profiles p ON p.user_id = cp.user_id
    WHERE cp.competition_id = p_competition_id AND cp.status = 'winner';

    INSERT INTO public.notifications (user_id, type, competition_id, payload)
    VALUES (
      v_competition.created_by,
      'competition_host_payout',
      p_competition_id,
      jsonb_build_object(
        'competition_code', v_competition.code,
        'competition_name', v_competition.name,
        'prize_value', v_competition.prize_value,
        'goal_value', v_competition.goal_value,
        'meta_reached', true,
        'winner_team_name', v_winner_team_name,
        'winners', COALESCE(v_winners, '[]'::jsonb),
        'message', 'A competição acabou. Faça o pagamento dos ganhadores.'
      )
    )
    ON CONFLICT (user_id, competition_id, type) DO NOTHING;
  ELSE
    INSERT INTO public.notifications (user_id, type, competition_id, payload)
    VALUES (
      v_competition.created_by,
      'competition_host_no_winner',
      p_competition_id,
      jsonb_build_object(
        'competition_code', v_competition.code,
        'competition_name', v_competition.name,
        'goal_value', v_competition.goal_value,
        'prize_value', v_competition.prize_value,
        'meta_reached', false,
        'message', 'Competição finalizada sem vencedor - meta não atingida.'
      )
    )
    ON CONFLICT (user_id, competition_id, type) DO NOTHING;
  END IF;

  -- Participant notifications (igual finalize_competition)
  IF v_meta_reached THEN
    INSERT INTO public.notifications (user_id, type, competition_id, payload)
    SELECT 
      cp.user_id,
      'competition_finish_winner',
      p_competition_id,
      jsonb_build_object(
        'competition_name', v_competition.name,
        'prize_value_total', v_competition.prize_value,
        'payout_value', cp.payout_value,
        'message', 'Seu time ganhou a competição! Você vai receber R$ ' || cp.payout_value::text || '. O host da competição vai entrar em contato para combinar o pagamento do prêmio.'
      )
    FROM public.competition_payouts cp
    WHERE cp.competition_id = p_competition_id
      AND cp.status = 'winner'
    ON CONFLICT (user_id, competition_id, type) DO NOTHING;

    INSERT INTO public.notifications (user_id, type, competition_id, payload)
    SELECT 
      cp.user_id,
      'competition_finish_loser',
      p_competition_id,
      jsonb_build_object(
        'competition_name', v_competition.name,
        'message', 'Não foi dessa vez, mas você mandou bem! Participe de outras competições e continue evoluindo — a próxima pode ser a sua.'
      )
    FROM public.competition_payouts cp
    WHERE cp.competition_id = p_competition_id
      AND cp.status = 'loser'
    ON CONFLICT (user_id, competition_id, type) DO NOTHING;
  ELSE
    INSERT INTO public.notifications (user_id, type, competition_id, payload)
    SELECT 
      cp.user_id,
      'competition_finish_loser',
      p_competition_id,
      jsonb_build_object(
        'competition_name', v_competition.name,
        'message', 'A competição finalizou, mas a meta não foi atingida. Não houve vencedores desta vez — continue participando para aumentar suas chances!'
      )
    FROM public.competition_payouts cp
    WHERE cp.competition_id = p_competition_id
    ON CONFLICT (user_id, competition_id, type) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'finalized', true,
    'winner_type', v_winner_type,
    'winner_team_id', v_winner_team_id,
    'winner_user_id', v_winner_user_id,
    'winner_total', v_winner_total,
    'meta_reached', v_meta_reached,
    'payout_per_winner', v_payout_per_winner
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_clear_competition_notifications(p_competition_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_admin boolean;
  v_deleted_notifications int;
  v_deleted_payouts int;
  v_deleted_results int;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- Only admins can clear test data
  SELECT public.has_role(v_user_id, 'admin') INTO v_is_admin;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Apenas administradores podem limpar mensagens de competição';
  END IF;

  DELETE FROM public.notifications
  WHERE competition_id = p_competition_id
    AND type IN (
      'competition_finish_winner',
      'competition_finish_loser',
      'competition_host_payout',
      'competition_host_no_winner'
    );
  GET DIAGNOSTICS v_deleted_notifications = ROW_COUNT;

  DELETE FROM public.competition_payouts
  WHERE competition_id = p_competition_id;
  GET DIAGNOSTICS v_deleted_payouts = ROW_COUNT;

  DELETE FROM public.competition_results
  WHERE competition_id = p_competition_id;
  GET DIAGNOSTICS v_deleted_results = ROW_COUNT;

  RETURN jsonb_build_object(
    'cleared', true,
    'deleted_notifications', v_deleted_notifications,
    'deleted_payouts', v_deleted_payouts,
    'deleted_results', v_deleted_results
  );
END;
$function$;