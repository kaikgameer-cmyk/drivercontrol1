export type PlanId = "monthly" | "quarterly" | "yearly";
export type BillingInterval = "month" | "quarter" | "year";

export interface Plan {
  id: PlanId;
  name: string;
  displayName: string;
  priceLabel: string;
  checkoutUrl: string;
  highlight: boolean;
  popular: boolean;
  bestValue: boolean;
  billingInterval: BillingInterval;
  subtitle: string;
}

export const PLANS: Record<PlanId, Plan> = {
  monthly: {
    id: "monthly",
    name: "New Gestão - Mensal",
    displayName: "Mensal",
    priceLabel: "R$ 39,90 / mês",
    checkoutUrl: "https://pay.kiwify.com.br/51OuL2D",
    highlight: false,
    popular: false,
    bestValue: false,
    billingInterval: "month",
    subtitle: "Para quem quer testar",
  },
  quarterly: {
    id: "quarterly",
    name: "New Gestão - Trimestral",
    displayName: "Trimestral",
    priceLabel: "R$ 89,70 / trimestre",
    checkoutUrl: "https://pay.kiwify.com.br/BbhpYl4",
    highlight: true,
    popular: true,
    bestValue: false,
    billingInterval: "quarter",
    subtitle: "3x de R$ 32,01",
  },
  yearly: {
    id: "yearly",
    name: "New Gestão - Anual",
    displayName: "Anual",
    priceLabel: "R$ 297,90 / ano",
    checkoutUrl: "https://pay.kiwify.com.br/YY05uru",
    highlight: false,
    popular: false,
    bestValue: true,
    billingInterval: "year",
    subtitle: "12x de R$ 30,81",
  },
} as const;

export const PLANS_LIST = Object.values(PLANS);

export interface PlanFeatureRow {
  id: string;
  label: string;
  monthly: boolean;
  quarterly: boolean;
  yearly: boolean;
}

export const PLAN_FEATURES: PlanFeatureRow[] = [
  {
    id: "full_dashboard",
    label: "Dashboard completo com visão diária, semanal, mensal e anual",
    monthly: true,
    quarterly: true,
    yearly: true,
  },
  {
    id: "fuel_control",
    label: "Controle de combustível com cálculo automático de média e custo por km",
    monthly: true,
    quarterly: true,
    yearly: true,
  },
  {
    id: "expense_management",
    label: "Gestão de despesas, recorrências e controle de cartões de crédito",
    monthly: true,
    quarterly: true,
    yearly: true,
  },
  {
    id: "goals_competitions",
    label: "Metas diárias e mensais, competições e ranking entre motoristas",
    monthly: true,
    quarterly: true,
    yearly: true,
  },
  {
    id: "maintenance_control",
    label: "Controle de manutenção com alertas de revisão por km",
    monthly: true,
    quarterly: true,
    yearly: true,
  },
  {
    id: "support_email",
    label: "Suporte por e-mail em horário comercial",
    monthly: true,
    quarterly: true,
    yearly: true,
  },
  {
    id: "priority_support",
    label: "Suporte com prioridade na fila de atendimento",
    monthly: false,
    quarterly: true,
    yearly: true,
  },
  {
    id: "price_savings_quarterly",
    label: "Economia em relação ao plano mensal",
    monthly: false,
    quarterly: true,
    yearly: true,
  },
  {
    id: "annual_bonus",
    label: "Maior economia ao longo do ano e foco em resultado de longo prazo",
    monthly: false,
    quarterly: false,
    yearly: true,
  },
];

// Map billing_interval from database to plan
export function getPlanByInterval(interval: BillingInterval | string): Plan {
  switch (interval) {
    case "month":
      return PLANS.monthly;
    case "quarter":
      return PLANS.quarterly;
    case "year":
      return PLANS.yearly;
    default:
      return PLANS.monthly;
  }
}

// Get plan display name for UI
export function getPlanDisplayName(interval: BillingInterval | string): string {
  return getPlanByInterval(interval).name;
}

// Legacy exports for backwards compatibility
export const KIWIFY_CHECKOUT_MENSAL = PLANS.monthly.checkoutUrl;
export const KIWIFY_CHECKOUT_TRIMESTRAL = PLANS.quarterly.checkoutUrl;
export const KIWIFY_CHECKOUT_ANUAL = PLANS.yearly.checkoutUrl;
