-- Restrict PIX and member data visibility on competition_members

-- Remove overly broad member visibility policy
DROP POLICY IF EXISTS "Members can view other members" ON public.competition_members;

-- Allow each user to see only their own membership row (including their own PIX data)
CREATE POLICY "Members can view own membership"
ON public.competition_members
FOR SELECT
USING (auth.uid() = user_id);

-- Allow the competition host to see all members (needed for payouts, admin views)
CREATE POLICY "Host can view competition members"
ON public.competition_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.competitions c
    WHERE c.id = competition_members.competition_id
      AND c.created_by = auth.uid()
  )
);