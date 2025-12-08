import { Card } from "@/components/ui/card";
import { BarChart3, Calendar, Fuel, CreditCard } from "lucide-react";

const previews = [
  {
    icon: BarChart3,
    title: "Dashboard Mensal",
    description: "Visão geral de receitas, despesas e lucro do mês",
  },
  {
    icon: Calendar,
    title: "Relatório Semanal",
    description: "Acompanhe seu desempenho semana a semana",
  },
  {
    icon: Fuel,
    title: "Controle de Combustível",
    description: "Histórico e métricas de abastecimento",
  },
  {
    icon: CreditCard,
    title: "Gestão de Cartões",
    description: "Faturas e gastos por cartão de crédito",
  },
];

export function PreviewsSection() {
  return (
    <section className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-dark" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Conheça as <span className="text-gradient-primary">telas</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Interface limpa e objetiva para você focar no que importa
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {previews.map((preview, index) => (
            <Card
              key={index}
              variant="elevated"
              className="group overflow-hidden hover:border-primary/30 transition-all duration-300"
            >
              <div className="aspect-[4/3] bg-secondary/30 flex items-center justify-center border-b border-border/50">
                <preview.icon className="w-16 h-16 text-primary/30 group-hover:text-primary/50 transition-colors" />
              </div>
              <div className="p-4">
                <h3 className="font-semibold mb-1">{preview.title}</h3>
                <p className="text-sm text-muted-foreground">{preview.description}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
