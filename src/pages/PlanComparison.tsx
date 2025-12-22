import { Check } from "lucide-react";
import { PLANS_LIST } from "@/config/plans";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PLAN_FEATURES } from "@/config/plans";
import { cn } from "@/lib/utils";

export default function PlanComparisonPage() {
  const handleSelectPlan = (checkoutUrl: string) => {
    window.open(checkoutUrl, "_blank");
  };

  return (
    <main className="min-h-screen bg-background py-12 px-4">
      <section className="max-w-5xl mx-auto space-y-8">
        <header className="text-center space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Compare os planos do <span className="text-gradient-primary">New Gestão</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Veja tudo o que está incluído em cada plano para escolher a opção ideal para a sua rotina de motorista.
          </p>
        </header>

        {/* Resumo dos planos */}
        <section aria-label="Resumo dos planos" className="grid md:grid-cols-3 gap-4">
          {PLANS_LIST.map((plan) => (
            <Card
              key={plan.id}
              className={cn(
                "p-5 flex flex-col gap-3 border-border/80 bg-card/80",
                plan.bestValue && "border-primary/60 shadow-lg shadow-primary/10"
              )}
            >
              <h2 className="text-lg font-semibold text-foreground text-center">
                {plan.displayName}
              </h2>
              <p className="text-sm text-muted-foreground text-center">{plan.subtitle}</p>
              <p className="text-xl font-bold text-foreground text-center mt-2">
                {plan.priceLabel}
              </p>
              <Button
                size="sm"
                className="mt-4 w-full"
                onClick={() => handleSelectPlan(plan.checkoutUrl)}
              >
                Escolher plano {plan.displayName}
              </Button>
            </Card>
          ))}
        </section>

        {/* Tabela de comparação */}
        <section aria-label="Tabela de comparação de recursos" className="mt-6">
          <div className="rounded-2xl border border-border bg-card/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground min-w-[220px]">
                      Recurso
                    </th>
                    {PLANS_LIST.map((plan) => (
                      <th
                        key={plan.id}
                        className="px-4 py-3 text-xs font-medium text-muted-foreground text-center min-w-[140px]"
                      >
                        {plan.displayName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PLAN_FEATURES.map((feature, index) => (
                    <tr
                      key={feature.id}
                      className={cn(
                        "border-t border-border/60",
                        index % 2 === 1 && "bg-muted/30"
                      )}
                    >
                      <td className="px-4 py-3 align-top text-foreground font-medium">
                        {feature.label}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {feature.monthly && (
                          <Check className="w-4 h-4 mx-auto text-success" aria-label="Incluído" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {feature.quarterly && (
                          <Check className="w-4 h-4 mx-auto text-success" aria-label="Incluído" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {feature.yearly && (
                          <Check className="w-4 h-4 mx-auto text-success" aria-label="Incluído" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <p className="text-center text-xs text-muted-foreground">
          Pagamento seguro via Kiwify. Você pode alterar ou cancelar seu plano a qualquer momento.
        </p>
      </section>
    </main>
  );
}
