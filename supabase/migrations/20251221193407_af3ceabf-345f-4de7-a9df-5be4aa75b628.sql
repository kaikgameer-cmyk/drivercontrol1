-- Performance indexes for competitions-related tables
CREATE INDEX IF NOT EXISTS idx_competitions_end_date ON public.competitions(end_date);
CREATE INDEX IF NOT EXISTS idx_competitions_start_date ON public.competitions(start_date);
CREATE INDEX IF NOT EXISTS idx_competitions_created_by ON public.competitions(created_by);

CREATE INDEX IF NOT EXISTS idx_competition_members_competition_user
  ON public.competition_members(competition_id, user_id);

CREATE INDEX IF NOT EXISTS idx_competition_results_competition
  ON public.competition_results(competition_id);

CREATE INDEX IF NOT EXISTS idx_competition_payouts_competition_user
  ON public.competition_payouts(competition_id, user_id);
