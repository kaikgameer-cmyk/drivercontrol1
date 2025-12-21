ALTER TABLE public.competition_results DROP CONSTRAINT IF EXISTS competition_results_winner_type_check;
ALTER TABLE public.competition_results
  ADD CONSTRAINT competition_results_winner_type_check
  CHECK (winner_type = ANY (ARRAY['team'::text, 'individual'::text, 'none'::text]));