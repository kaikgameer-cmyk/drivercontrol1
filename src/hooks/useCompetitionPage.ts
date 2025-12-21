import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { isUUID } from "@/lib/utils";

// Types for the new unified page RPC
export interface CompetitionPageData {
  competition: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    goal_type: string;
    goal_value: number;
    prize_value: number;
    start_date: string;
    end_date: string;
    max_members: number | null;
    allow_teams: boolean;
    team_size: number | null;
    host_user_id: string;
    participants_count: number;
  };
  my_membership: {
    is_host: boolean;
    is_member: boolean;
  };
  leaderboard: {
    members: LeaderboardMember[];
    all_members: AllMember[];
    teams: LeaderboardTeam[] | null;
  } | null;
  flags: {
    is_started: boolean;
    is_finalized: boolean;
    is_joinable: boolean;
  };
}

export interface LeaderboardMember {
  user_id: string;
  display_name: string;
  role: string;
  is_competitor: boolean;
  total_income: number;
  score: number;
  progress: number;
}

export interface AllMember {
  user_id: string;
  display_name: string;
  role: string;
  is_competitor: boolean;
}

export interface LeaderboardTeam {
  team_id: string;
  team_name: string;
  team_score: number;
  members: { user_id: string; display_name: string }[];
}

// Resolve ID from code if needed
async function resolveCompetitionId(idOrCode: string): Promise<string | null> {
  if (isUUID(idOrCode)) {
    return idOrCode;
  }
  
  // Fallback: resolve code to ID
  const { data, error } = await supabase.rpc("get_competition_id_by_code", {
    p_code: idOrCode,
  });
  
  if (error || !data) return null;
  return data as string;
}

// Main hook for competition page - single RPC call
export function useCompetitionPage(idOrCode: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["competition-page", idOrCode],
    queryFn: async (): Promise<CompetitionPageData | null> => {
      if (!idOrCode) return null;

      const competitionId = await resolveCompetitionId(idOrCode);
      if (!competitionId) return null;

      const { data, error } = await supabase.rpc("get_competition_page", {
        p_competition_id: competitionId,
      });

      if (error) {
        console.error("get_competition_page error:", error);
        throw error;
      }
      
      return data as unknown as CompetitionPageData | null;
    },
    enabled: !!user && !!idOrCode,
    staleTime: 30000, // 30s cache
    retry: 1,
  });
}

// Finalize competition - call once and never loop
export function useFinalizeOnce() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (competitionId: string) => {
      const { data, error } = await supabase.rpc("finalize_competition_if_needed", {
        p_competition_id: competitionId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, competitionId) => {
      queryClient.invalidateQueries({ queryKey: ["competition-page", competitionId] });
      queryClient.invalidateQueries({ queryKey: ["competitions-for-tabs"] });
    },
    onError: (error: Error) => {
      console.error("Finalize error:", error);
    },
  });
}
