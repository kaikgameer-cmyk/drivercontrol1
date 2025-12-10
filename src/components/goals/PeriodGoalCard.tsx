import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Target, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface DayData {
  date: string;
  goal: number | null;
  revenue: number;
}

interface PeriodGoalCardProps {
  days: DayData[];
  periodLabel: string;
}

/**
 * Compact card component displaying goals summary for a multi-day period
 * Shows total goal vs total revenue with collapsible daily breakdown
 */
export function PeriodGoalCard({ days, periodLabel }: PeriodGoalCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const totalGoal = days.reduce((sum, day) => sum + (day.goal || 0), 0);
  const totalRevenue = days.reduce((sum, day) => sum + day.revenue, 0);
  const daysWithGoal = days.filter(day => day.goal !== null && day.goal > 0).length;
  const daysWithoutGoal = days.length - daysWithGoal;
  const percentage = totalGoal > 0 ? Math.min((totalRevenue / totalGoal) * 100, 100) : 0;
  const achieved = totalGoal > 0 && totalRevenue >= totalGoal;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}`;
  };

  if (daysWithGoal === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Target className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Metas do Período</p>
              <p className="text-xs text-muted-foreground">
                Nenhuma meta definida para este período
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "bg-card border-border transition-all",
      achieved && "border-green-500/50 bg-green-500/5"
    )}>
      <CardContent className="p-4">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          {/* Compact Summary */}
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                  achieved ? "bg-green-500/20" : "bg-primary/10"
                )}>
                  <TrendingUp className={cn(
                    "h-5 w-5",
                    achieved ? "text-green-500" : "text-primary"
                  )} />
                </div>
                <div>
                  <p className="text-sm font-medium">{periodLabel}</p>
                  <p className="text-xs text-muted-foreground">
                    {daysWithGoal} dia{daysWithGoal !== 1 ? 's' : ''} com meta
                    {daysWithoutGoal > 0 && `, ${daysWithoutGoal} sem`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={cn(
                  "text-lg font-bold",
                  achieved ? "text-green-500" : "text-foreground"
                )}>
                  {percentage.toFixed(0)}%
                </p>
                <p className="text-xs text-muted-foreground">da meta</p>
              </div>
            </div>

            {/* Progress and Stats */}
            <div className="space-y-2">
              <Progress value={percentage} className="h-2" />
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-muted-foreground">Meta: </span>
                    <span className="font-medium">{formatCurrency(totalGoal)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Faturado: </span>
                    <span className="font-medium">{formatCurrency(totalRevenue)}</span>
                  </div>
                </div>
                <span className={cn(
                  "font-medium",
                  achieved ? "text-green-500" : "text-red-500"
                )}>
                  {achieved ? '✓ Batida' : '✗ Não batida'}
                </span>
              </div>
            </div>

            {/* Toggle Button */}
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Ocultar detalhamento
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Ver detalhamento por dia
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
          </div>

          {/* Collapsible Daily Breakdown */}
          <CollapsibleContent>
            <div className="border-t border-border pt-3 mt-2">
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {days.map((day) => {
                  const dayPercentage = day.goal && day.goal > 0 
                    ? (day.revenue / day.goal) * 100 
                    : 0;
                  const dayAchieved = day.goal && day.revenue >= day.goal;
                  
                  return (
                    <div key={day.date} className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-muted/50">
                      <span className="text-muted-foreground font-medium">{formatDate(day.date)}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">
                          {day.goal ? formatCurrency(day.goal) : 'Sem meta'}
                        </span>
                        <span className="text-foreground font-medium min-w-[70px] text-right">
                          {formatCurrency(day.revenue)}
                        </span>
                        {day.goal && day.goal > 0 && (
                          <span className={cn(
                            "text-xs min-w-[40px] text-right",
                            dayAchieved ? "text-green-500" : "text-red-500"
                          )}>
                            {dayPercentage.toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
