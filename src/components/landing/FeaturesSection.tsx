import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Fuel, CreditCard, Calendar, Gauge, PieChart } from "lucide-react";

const features = [
  {
    icon: TrendingUp,
    title: "Resumo semanal de lucros",
    description: "Veja quanto realmente sobrou depois de todas as despesas.",
  },
  {
    icon: Fuel,
    title: "Controle de combustível",
    description: "Custo por km, consumo médio e histórico de abastecimentos.",
  },
  {
    icon: CreditCard,
    title: "Gestão de cartões",
    description: "Qual cartão foi usado, fatura atual e gastos por categoria.",
  },
  {
    icon: Calendar,
    title: "Resumo mensal",
    description: "Visão geral do lucro líquido do mês com comparativos.",
  },
  {
    icon: Gauge,
    title: "Métricas em tempo real",
    description: "KPIs atualizados automaticamente conforme você lança.",
  },
  {
    icon: PieChart,
    title: "Gráficos intuitivos",
    description: "Visualize suas finanças de forma clara e objetiva.",
  },
];

export function FeaturesSection() {
  return (
    <section id="recursos" className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-dark" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            O que você vê no <span className="text-gradient-primary">sistema</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Tudo o que você precisa para entender suas finanças como motorista de app
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card
              key={index}
              variant="glass"
              className="group hover:border-primary/30 hover:shadow-primary transition-all duration-300"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
