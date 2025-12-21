-- Fix infinite recursion in RLS policies for competition_members by removing dependency on competitions RLS

-- Helper function to check if current user is the host of a competition
CREATE OR REPLACE FUNCTION public.is_competition_host(_competition_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.competitions c
    WHERE c.id = _competition_id
      AND c.created_by = _user_id
  );
$$;

-- Recreate RLS policies on competition_members without querying competitions directly
DROP POLICY IF EXISTS "Host can view competition members" ON public.competition_members;
DROP POLICY IF EXISTS "Members can leave competition" ON public.competition_members;
DROP POLICY IF EXISTS "Members can view own membership" ON public.competition_members;
DROP POLICY IF EXISTS "Users can update own competition membership" ON public.competition_members;

-- SELECT: user can view own membership
CREATE POLICY "Members can view own membership"
ON public.competition_members
FOR SELECT
USING (auth.uid() = user_id);

-- SELECT: host can view all members of their competition (no recursion)
CREATE POLICY "Host can view competition members"
ON public.competition_members
FOR SELECT
USING (public.is_competition_host(competition_id, auth.uid()));

-- UPDATE: user can update own membership (needed for transparency acceptance)
CREATE POLICY "Users can update own competition membership"
ON public.competition_members
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE: user can delete own membership, host can delete members
CREATE POLICY "Members can leave competition"
ON public.competition_members
FOR DELETE
USING (
  (auth.uid() = user_id)
  OR public.is_competition_host(competition_id, auth.uid())
);
