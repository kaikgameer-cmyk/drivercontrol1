import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Users, Calendar, Target, Loader2 } from "lucide-react";
import { useCompetitionHistory } from "@/hooks/useCompetitionHistory";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { AchievementBadges } from "@/components/competitions/AchievementBadges";

export function CompetitionHistory() {
  const { data, isLoading } = useCompetitionHistory();
  
  const history = data?.items || [];
  const historyStats = data?.stats;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Em andamento</Badge>;
      case "upcoming":
        return <Badge variant="outline">Em breve</Badge>;
      case "finished":
        return <Badge variant="secondary">Encerrada</Badge>;
      default:
        return null;
    }
  };

  const stats = {
    total: historyStats?.totalParticipations || 0,
    wins: historyStats?.totalWins || 0,
    active: history.filter((h) => h.status === "active").length,
    totalEarned: historyStats?.totalPrizes || 0,
  };

  return (
    <Card variant="elevated">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          <CardTitle className="text-base sm:text-lg">Histórico de Competições</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="flex flex-col items-start gap-1 p-3 rounded-lg bg-muted/60 min-w-0">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Participações</span>
            </div>
            <div className="text-lg md:text-2xl font-semibold text-foreground break-words">
              {stats.total}
            </div>
          </div>
          <div className="flex flex-col items-start gap-1 p-3 rounded-lg bg-primary/10 min-w-0">
            <div className="flex items-center gap-2">
              <Medal className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Vitórias</span>
            </div>
            <div className="text-lg md:text-2xl font-semibold text-primary break-words">
              {stats.wins}
            </div>
          </div>
          <div className="flex flex-col items-start gap-1 p-3 rounded-lg bg-muted/60 min-w-0">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-success" />
              <span className="text-xs text-muted-foreground">Ativas</span>
            </div>
            <div className="text-lg md:text-2xl font-semibold text-success break-words">
              {stats.active}
            </div>
          </div>
          <div className="flex flex-col items-start gap-1 p-3 rounded-lg bg-muted/60 min-w-0">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-muted-foreground">Prêmios ganhos</span>
            </div>
            <div className="text-sm md:text-base font-semibold text-amber-400 break-words">
              {formatCurrency(stats.totalEarned)}
            </div>
          </div>
        </div>

        {/* Achievements */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Conquistas</h3>
          <div className="-mx-1 px-1 overflow-x-auto pb-1">
            <AchievementBadges
              wins={stats.wins}
              participations={stats.total}
              totalPrizes={stats.totalEarned}
            />
          </div>
        </div>

        {/* Competition List */}
        {history && history.length > 0 ? (
          <div className="space-y-3">
            {history.map((competition) => (
              <Link
                key={competition.id}
                to={`/dashboard/competicoes/${competition.id}`}
                className="block min-w-0"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 rounded-lg border border-border bg-card hover:bg-accent/40 transition-colors min-w-0">
                  {/* Icon */}
                  <div
                    className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${
                      competition.is_winner ? "bg-primary/20" : "bg-muted"
                    }`}
                  >
                    {competition.is_winner ? (
                      <Medal className="w-5 h-5 text-primary" />
                    ) : (
                      <Users className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium text-sm sm:text-base break-words line-clamp-2">
                        {competition.name}
                      </span>
                      {competition.is_winner && (
                        <Badge className="bg-primary/20 text-primary border-primary/30 gap-1 text-[11px]">
                          <Trophy className="w-3 h-3" />
                          Vencedor
                        </Badge>
                      )}
                      {competition.role === "host" && (
                        <Badge variant="outline" className="text-[11px]">
                          Host
                        </Badge>
                      )}
                      {getStatusBadge(competition.status)}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 min-w-0">
                        <Calendar className="w-3 h-3" />
                        <span className="truncate">
                          {format(new Date(competition.start_date), "dd MMM", { locale: ptBR })} – {" "}
                          {format(new Date(competition.end_date), "dd MMM yyyy", { locale: ptBR })}
                        </span>
                      </span>
                      {competition.is_competitor && (
                        <span className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          <span className="whitespace-nowrap">
                            Meu total: {formatCurrency(competition.user_score)}
                          </span>
                        </span>
                      )}
                    </div>

                    {/* Meta / Total / Prêmio mini grid */}
                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:text-[13px]">
                      <div className="flex flex-col min-w-0">
                        <span className="text-muted-foreground">Meta individual</span>
                        <span className="font-medium break-words">
                          {formatCurrency(competition.goal_value)}
                        </span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-muted-foreground">Meu total</span>
                        <span className="font-medium break-words">
                          {formatCurrency(competition.user_score)}
                        </span>
                      </div>
                      <div className="flex flex-col min-w-0 col-span-2 sm:col-span-1">
                        <span className="text-muted-foreground">Prêmio</span>
                        <span className="font-medium break-words">
                          {formatCurrency(competition.prize_value)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status & Prize summary */}
                  <div className="mt-2 sm:mt-0 sm:text-right space-y-1 text-xs flex-shrink-0">
                    {competition.payout_status === "winner" &&
                    competition.payout_value !== undefined ? (
                      <div className="text-primary font-medium">
                        Você ganhou:
                        <span className="ml-1">
                          {formatCurrency(competition.payout_value)}
                        </span>
                      </div>
                    ) : competition.payout_status === "no_winner" ? (
                      <div className="text-muted-foreground">Sem vencedor</div>
                    ) : competition.status === "finished" &&
                      competition.payout_status === "loser" ? (
                      <div className="text-muted-foreground">
                        Prêmio total:
                        <span className="ml-1">
                          {formatCurrency(competition.prize_value)}
                        </span>
                      </div>
                    ) : (
                      <div className="text-muted-foreground">
                        Prêmio total:
                        <span className="ml-1">
                          {formatCurrency(competition.prize_value)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Você ainda não participou de nenhuma competição.</p>
            <Link
              to="/dashboard/competicoes"
              className="text-primary hover:underline text-sm"
            >
              Ver competições disponíveis
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
