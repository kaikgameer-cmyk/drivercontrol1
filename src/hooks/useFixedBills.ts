import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export interface FixedBill {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  due_day: number | null;
  recurrence: string;
  start_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BillInstance {
  id: string;
  user_id: string;
  fixed_bill_id: string;
  month_year: string;
  due_date: string;
  amount: number;
  is_paid: boolean;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useFixedBills() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all fixed bills
  const { data: fixedBills = [], isLoading } = useQuery({
    queryKey: ["fixed_bills", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("fixed_bills")
        .select("*")
        .eq("user_id", user.id)
        .order("name");
      if (error) throw error;
      return data as FixedBill[];
    },
    enabled: !!user,
  });

  // Fetch active fixed bills for dropdown
  const { data: activeFixedBills = [] } = useQuery({
    queryKey: ["fixed_bills_active", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("fixed_bills")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as FixedBill[];
    },
    enabled: !!user,
  });

  // Create fixed bill
  const createFixedBill = useMutation({
    mutationFn: async (bill: {
      name: string;
      amount: number;
      due_day?: number | null;
      recurrence?: string;
      start_date?: string;
    }) => {
      if (!user) throw new Error("Não autenticado");

      const startDate = bill.start_date || format(new Date(), "yyyy-MM-dd");
      
      const { data, error } = await supabase
        .from("fixed_bills")
        .insert({
          user_id: user.id,
          name: bill.name,
          amount: bill.amount,
          due_day: bill.due_day || null,
          recurrence: bill.recurrence || "monthly",
          start_date: startDate,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      // Generate instance for current month
      if (data && bill.due_day) {
        const now = new Date();
        const monthYear = format(now, "yyyy-MM");
        const dueDate = calculateDueDate(now, bill.due_day);

        await supabase.from("bills_instances").insert({
          user_id: user.id,
          fixed_bill_id: data.id,
          month_year: monthYear,
          due_date: dueDate,
          amount: bill.amount,
          is_paid: false,
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixed_bills"] });
      queryClient.invalidateQueries({ queryKey: ["bills_instances"] });
      toast({ title: "Despesa fixa criada com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Erro ao criar despesa fixa", variant: "destructive" });
    },
  });

  // Update fixed bill
  const updateFixedBill = useMutation({
    mutationFn: async (bill: {
      id: string;
      name?: string;
      amount?: number;
      due_day?: number | null;
      recurrence?: string;
      is_active?: boolean;
    }) => {
      if (!user) throw new Error("Não autenticado");

      const { id, ...updates } = bill;
      const { error } = await supabase
        .from("fixed_bills")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixed_bills"] });
      toast({ title: "Despesa fixa atualizada!" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar despesa fixa", variant: "destructive" });
    },
  });

  // Delete fixed bill
  const deleteFixedBill = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Não autenticado");

      const { error } = await supabase
        .from("fixed_bills")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixed_bills"] });
      queryClient.invalidateQueries({ queryKey: ["bills_instances"] });
      toast({ title: "Despesa fixa removida!" });
    },
    onError: () => {
      toast({ title: "Erro ao remover despesa fixa", variant: "destructive" });
    },
  });

  // Toggle active status
  const toggleFixedBillActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      if (!user) throw new Error("Não autenticado");

      const { error } = await supabase
        .from("fixed_bills")
        .update({ is_active })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["fixed_bills"] });
      toast({ 
        title: variables.is_active ? "Despesa fixa ativada!" : "Despesa fixa desativada!" 
      });
    },
    onError: () => {
      toast({ title: "Erro ao alterar status", variant: "destructive" });
    },
  });

  // Generate instances for a specific month
  const generateMonthInstances = useMutation({
    mutationFn: async (targetDate?: Date) => {
      if (!user) throw new Error("Não autenticado");

      const date = targetDate || new Date();
      const monthYear = format(date, "yyyy-MM");

      // Get all active fixed bills
      const { data: bills, error: billsError } = await supabase
        .from("fixed_bills")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (billsError) throw billsError;

      let created = 0;

      for (const bill of bills || []) {
        if (!bill.due_day) continue;

        // Check if instance already exists
        const { data: existing } = await supabase
          .from("bills_instances")
          .select("id")
          .eq("fixed_bill_id", bill.id)
          .eq("month_year", monthYear)
          .maybeSingle();

        if (!existing) {
          const dueDate = calculateDueDate(date, bill.due_day);
          
          await supabase.from("bills_instances").insert({
            user_id: user.id,
            fixed_bill_id: bill.id,
            month_year: monthYear,
            due_date: dueDate,
            amount: bill.amount,
            is_paid: false,
          });
          created++;
        }
      }

      return created;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["bills_instances"] });
      toast({ 
        title: count > 0 
          ? `${count} instância(s) gerada(s) com sucesso!` 
          : "Todas as instâncias já existem para este mês."
      });
    },
    onError: () => {
      toast({ title: "Erro ao gerar instâncias", variant: "destructive" });
    },
  });

  return {
    fixedBills,
    activeFixedBills,
    isLoading,
    createFixedBill,
    updateFixedBill,
    deleteFixedBill,
    toggleFixedBillActive,
    generateMonthInstances,
  };
}

// Helper function to calculate due date for a given month
function calculateDueDate(date: Date, dueDay: number): string {
  const year = date.getFullYear();
  const month = date.getMonth();
  
  // Get last day of month
  const lastDay = new Date(year, month + 1, 0).getDate();
  const actualDay = Math.min(dueDay, lastDay);
  
  const dueDate = new Date(year, month, actualDay, 12, 0, 0);
  return format(dueDate, "yyyy-MM-dd");
}

// Hook for bill instances
export function useBillInstances(monthYear?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const targetMonth = monthYear || format(new Date(), "yyyy-MM");

  const { data: instances = [], isLoading } = useQuery({
    queryKey: ["bills_instances", user?.id, targetMonth],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("bills_instances")
        .select(`
          *,
          fixed_bill:fixed_bills(name)
        `)
        .eq("user_id", user.id)
        .eq("month_year", targetMonth)
        .order("due_date");

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const markAsPaid = useMutation({
    mutationFn: async ({ id, is_paid }: { id: string; is_paid: boolean }) => {
      if (!user) throw new Error("Não autenticado");

      const { error } = await supabase
        .from("bills_instances")
        .update({ 
          is_paid, 
          paid_at: is_paid ? new Date().toISOString() : null 
        })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bills_instances"] });
      toast({ 
        title: variables.is_paid ? "Marcado como pago!" : "Marcado como pendente!" 
      });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    },
  });

  return {
    instances,
    isLoading,
    markAsPaid,
  };
}
