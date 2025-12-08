import { useQueryClient } from "@tanstack/react-query";

export function useInvalidateFinancialData() {
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    // Invalidate all financial data queries to keep everything in sync
    queryClient.invalidateQueries({ queryKey: ["revenues"] });
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
    queryClient.invalidateQueries({ queryKey: ["credit_cards"] });
    queryClient.invalidateQueries({ queryKey: ["card_expenses"] });
    queryClient.invalidateQueries({ queryKey: ["fuel_logs"] });
  };

  return { invalidateAll };
}
