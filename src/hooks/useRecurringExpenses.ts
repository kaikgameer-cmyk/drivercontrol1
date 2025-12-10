import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface RecurringExpense {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  recurrence_type: "single" | "monthly";
  recurrence_day: number | null;
  created_at: string;
  updated_at: string;
}

export function useRecurringExpenses(userId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: recurringExpenses = [], isLoading } = useQuery({
    queryKey: ["recurring_expenses", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("recurring_expenses")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as RecurringExpense[];
    },
    enabled: !!userId,
  });

  const createMutation = useMutation({
    mutationFn: async (expense: {
      name: string;
      amount: number;
      start_date: string;
      end_date?: string | null;
      recurrence_type: "single" | "monthly";
      recurrence_day?: number | null;
    }) => {
      if (!userId) throw new Error("User not authenticated");
      const { error } = await supabase.from("recurring_expenses").insert({
        user_id: userId,
        name: expense.name,
        amount: expense.amount,
        start_date: expense.start_date,
        end_date: expense.end_date || null,
        recurrence_type: expense.recurrence_type,
        recurrence_day: expense.recurrence_day || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring_expenses"] });
      toast({ title: "Despesa fixa adicionada com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao adicionar despesa fixa", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (expense: {
      id: string;
      name?: string;
      amount?: number;
      start_date?: string;
      end_date?: string | null;
      is_active?: boolean;
      recurrence_type?: "single" | "monthly";
      recurrence_day?: number | null;
    }) => {
      const { id, ...updates } = expense;
      const { error } = await supabase
        .from("recurring_expenses")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring_expenses"] });
      toast({ title: "Despesa fixa atualizada!" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar despesa fixa", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("recurring_expenses")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring_expenses"] });
      toast({ title: "Despesa fixa removida!" });
    },
    onError: () => {
      toast({ title: "Erro ao remover despesa fixa", variant: "destructive" });
    },
  });

  return {
    recurringExpenses,
    isLoading,
    createRecurring: createMutation.mutate,
    updateRecurring: updateMutation.mutate,
    deleteRecurring: deleteMutation.mutate,
  };
}

/**
 * Calculate daily recurring expense for a given date
 * Handles both single-day and monthly recurring expenses
 */
export function calculateDailyRecurringAmount(
  recurringExpenses: RecurringExpense[],
  date: Date
): { total: number; breakdown: { name: string; dailyAmount: number }[] } {
  const DAYS_DIVISOR = 30; // Divide monthly by 30 days
  const dateStr = date.toISOString().split("T")[0];
  const dayOfMonth = date.getDate();

  const breakdown: { name: string; dailyAmount: number }[] = [];

  for (const expense of recurringExpenses) {
    if (!expense.is_active) continue;
    if (expense.start_date > dateStr) continue;
    if (expense.end_date && expense.end_date < dateStr) continue;

    if (expense.recurrence_type === "single") {
      // Single day expense - only applies on the exact start_date
      if (expense.start_date === dateStr) {
        breakdown.push({
          name: expense.name,
          dailyAmount: expense.amount,
        });
      }
    } else {
      // Monthly recurring - applies daily as amount/30
      // If recurrence_day is set, check if today is that day (for specific day reporting)
      breakdown.push({
        name: expense.name,
        dailyAmount: expense.amount / DAYS_DIVISOR,
      });
    }
  }

  const total = breakdown.reduce((sum, item) => sum + item.dailyAmount, 0);

  return { total, breakdown };
}

/**
 * Calculate total recurring expenses for a date range
 * Properly handles single-day and monthly recurring expenses
 */
export function calculatePeriodRecurringAmount(
  recurringExpenses: RecurringExpense[],
  startDate: Date,
  endDate: Date
): number {
  const DAYS_DIVISOR = 30;
  let total = 0;

  for (const expense of recurringExpenses) {
    if (!expense.is_active) continue;

    const expenseStart = new Date(expense.start_date + "T12:00:00");
    const expenseEnd = expense.end_date ? new Date(expense.end_date + "T12:00:00") : null;

    // Check if expense is within the period
    if (expenseStart > endDate) continue;
    if (expenseEnd && expenseEnd < startDate) continue;

    if (expense.recurrence_type === "single") {
      // Single day expense - only count if it falls within the period
      if (expenseStart >= startDate && expenseStart <= endDate) {
        total += expense.amount;
      }
    } else {
      // Monthly recurring - calculate proportionally
      const periodStart = expenseStart > startDate ? expenseStart : startDate;
      const periodEnd = expenseEnd && expenseEnd < endDate ? expenseEnd : endDate;
      
      const daysInPeriod = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      total += (expense.amount / DAYS_DIVISOR) * daysInPeriod;
    }
  }

  return total;
}
