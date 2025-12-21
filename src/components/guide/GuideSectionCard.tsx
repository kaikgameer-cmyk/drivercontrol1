import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { GuideSection } from "@/config/guideConfig";

interface GuideSectionCardProps {
  section: GuideSection;
}

/**
 * Componente de card para exibir uma seção do guia
 * Inclui features, regras, erros comuns e dicas
 */
export function GuideSectionCard({ section }: GuideSectionCardProps) {
  const Icon = section.icon;

  return (
    <Card className="bg-card border-border" id={section.id}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <CardTitle className="text-xl">{section.title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Description */}
        <p className="text-muted-foreground">{section.description}</p>

        {/* Features - "Como usar" */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-primary uppercase tracking-wide">
            Como funciona
          </h4>
          {section.features.map((feature, index) => (
            <div key={index} className="border-l-2 border-primary/30 pl-4">
              <h5 className="font-medium text-foreground mb-1">{feature.title}</h5>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Rules - "Regras importantes" */}
        {section.rules && section.rules.length > 0 && (
          <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-foreground font-medium text-sm">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              Regras importantes
            </div>
            <ul className="space-y-2">
              {section.rules.map((rule, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Common Errors - "Erros comuns / como resolver" */}
        {section.commonErrors && section.commonErrors.length > 0 && (
          <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-destructive font-medium text-sm">
              <AlertTriangle className="w-4 h-4" />
              Erros comuns e soluções
            </div>
            <div className="space-y-3">
              {section.commonErrors.map((item, index) => (
                <div key={index} className="text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-3 h-3 text-destructive shrink-0" />
                    <span className="text-foreground font-medium">{item.error}</span>
                  </div>
                  <div className="flex items-center gap-2 ml-5">
                    <CheckCircle2 className="w-3 h-3 text-success shrink-0" />
                    <span className="text-muted-foreground">{item.solution}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tips - "Dicas" */}
        {section.tips && section.tips.length > 0 && (
          <div className="bg-primary/5 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-primary font-medium text-sm">
              <Lightbulb className="w-4 h-4" />
              Dicas
            </div>
            <ul className="space-y-1">
              {section.tips.map((tip, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary">•</span>
                  {tip.text}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
