import { Check, Smartphone, Calendar, BarChart3 } from "lucide-react";

const benefits = [
  {
    icon: Smartphone,
    text: "Interface simples, sem termos difíceis de finanças.",
  },
  {
    icon: Calendar,
    text: "Foco em semanas, não só em mês.",
  },
  {
    icon: BarChart3,
    text: "Funciona muito bem no celular.",
  },
  {
    icon: Check,
    text: "Feito por quem entende a rotina de motorista.",
  },
];

export function BenefitsSection() {
  return (
    <section id="como-funciona" className="py-24 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <h2 className="text-3xl md:text-4xl font-bold">
              Feito para <span className="text-gradient-primary">motorista de app</span>
            </h2>
            
            <div className="space-y-6">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-4 group">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                    <benefit.icon className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-lg text-foreground/90 pt-2">{benefit.text}</p>
                </div>
              ))}
            </div>
          </div>
          
          {/* Stats showcase */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 rounded-2xl bg-gradient-card border border-border/50 text-center">
              <p className="text-4xl font-bold text-primary mb-2">5min</p>
              <p className="text-sm text-muted-foreground">Para lançar uma semana</p>
            </div>
            <div className="p-6 rounded-2xl bg-gradient-card border border-border/50 text-center">
              <p className="text-4xl font-bold text-primary mb-2">100%</p>
              <p className="text-sm text-muted-foreground">Mobile friendly</p>
            </div>
            <div className="p-6 rounded-2xl bg-gradient-card border border-border/50 text-center">
              <p className="text-4xl font-bold text-primary mb-2">∞</p>
              <p className="text-sm text-muted-foreground">Lançamentos</p>
            </div>
            <div className="p-6 rounded-2xl bg-gradient-card border border-border/50 text-center">
              <p className="text-4xl font-bold text-primary mb-2">7</p>
              <p className="text-sm text-muted-foreground">Dias de visão semanal</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
