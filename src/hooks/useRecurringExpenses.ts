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
  recurrence_type: "monthly_fixed_day" | "distributed";
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
      recurrence_type: "monthly_fixed_day" | "distributed";
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
      recurrence_type?: "monthly_fixed_day" | "distributed";
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
 * - monthly_fixed_day: Full value on that specific day of month
 * - distributed: Daily prorated value within date range
 */
export function calculateDailyRecurringAmount(
  recurringExpenses: RecurringExpense[],
  date: Date
): { total: number; breakdown: { name: string; dailyAmount: number }[] } {
  const dateStr = date.toISOString().split("T")[0];
  const dayOfMonth = date.getDate();

  const breakdown: { name: string; dailyAmount: number }[] = [];

  for (const expense of recurringExpenses) {
    if (!expense.is_active) continue;
    if (expense.start_date > dateStr) continue;
    if (expense.end_date && expense.end_date < dateStr) continue;

    if (expense.recurrence_type === "monthly_fixed_day") {
      // Monthly fixed day - full value on that specific day each month
      if (expense.recurrence_day === dayOfMonth) {
        breakdown.push({
          name: expense.name,
          dailyAmount: expense.amount,
        });
      }
    } else if (expense.recurrence_type === "distributed") {
      // Distributed - prorated daily within the date range
      const expenseStart = new Date(expense.start_date + "T12:00:00");
      const expenseEnd = expense.end_date 
        ? new Date(expense.end_date + "T12:00:00") 
        : null;
      
      // Check if date is within the range
      if (date >= expenseStart && (!expenseEnd || date <= expenseEnd)) {
        // Calculate total days in range
        const endForCalc = expenseEnd || new Date(expense.start_date + "T12:00:00");
        const totalDays = Math.ceil(
          (endForCalc.getTime() - expenseStart.getTime()) / (1000 * 60 * 60 * 24)
        ) + 1;
        
        const dailyAmount = expense.amount / Math.max(totalDays, 1);
        breakdown.push({
          name: expense.name,
          dailyAmount,
        });
      }
    }
  }

  const total = breakdown.reduce((sum, item) => sum + item.dailyAmount, 0);

  return { total, breakdown };
}

/**
 * Calculate total recurring expenses for a date range
 * - monthly_fixed_day: Full value for each occurrence within the period
 * - distributed: Prorated amount for days within the period that overlap with expense range
 */
export function calculatePeriodRecurringAmount(
  recurringExpenses: RecurringExpense[],
  startDate: Date,
  endDate: Date
): number {
  let total = 0;

  for (const expense of recurringExpenses) {
    if (!expense.is_active) continue;

    const expenseStart = new Date(expense.start_date + "T12:00:00");
    const expenseEnd = expense.end_date ? new Date(expense.end_date + "T12:00:00") : null;

    // Check if expense is within the period
    if (expenseStart > endDate) continue;
    if (expenseEnd && expenseEnd < startDate) continue;

    if (expense.recurrence_type === "monthly_fixed_day") {
      // Monthly fixed day - count occurrences of that day within the period
      if (expense.recurrence_day) {
        const current = new Date(startDate);
        while (current <= endDate) {
          const dayOfMonth = current.getDate();
          const currentStr = current.toISOString().split("T")[0];
          
          // Check if this day matches and is within expense validity
          if (dayOfMonth === expense.recurrence_day) {
            if (currentStr >= expense.start_date && (!expense.end_date || currentStr <= expense.end_date)) {
              total += expense.amount;
            }
          }
          
          current.setDate(current.getDate() + 1);
        }
      }
    } else if (expense.recurrence_type === "distributed") {
      // Distributed - calculate prorated amount for overlapping days
      const rangeStart = expenseStart > startDate ? expenseStart : startDate;
      const rangeEnd = expenseEnd && expenseEnd < endDate ? expenseEnd : endDate;
      
      // Calculate total days in the expense range (for daily rate)
      const totalExpenseDays = expenseEnd 
        ? Math.ceil((expenseEnd.getTime() - expenseStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
        : 1;
      
      // Calculate days in the overlapping period
      const overlappingDays = Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      // Daily rate based on total expense range
      const dailyRate = expense.amount / Math.max(totalExpenseDays, 1);
      
      total += dailyRate * Math.max(overlappingDays, 0);
    }
  }

  return total;
}

/**
 * Calculate monthly expenses daily cost (for display - only monthly_fixed_day divided by 30)
 */
export function calculateMonthlyExpensesDailyCost(
  recurringExpenses: RecurringExpense[]
): { total: number; breakdown: { name: string; dailyAmount: number; monthlyAmount: number }[] } {
  const DAYS_DIVISOR = 30;
  const breakdown: { name: string; dailyAmount: number; monthlyAmount: number }[] = [];
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  for (const expense of recurringExpenses) {
    if (!expense.is_active) continue;
    if (expense.start_date > todayStr) continue;
    if (expense.end_date && expense.end_date < todayStr) continue;

    // Only include monthly_fixed_day expenses in daily cost calculation
    if (expense.recurrence_type === "monthly_fixed_day") {
      breakdown.push({
        name: expense.name,
        dailyAmount: expense.amount / DAYS_DIVISOR,
        monthlyAmount: expense.amount,
      });
    }
  }

  const total = breakdown.reduce((sum, item) => sum + item.dailyAmount, 0);
  return { total, breakdown };
}
