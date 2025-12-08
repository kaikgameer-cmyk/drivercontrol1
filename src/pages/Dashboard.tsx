import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Calendar } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Mock data for demonstration
const dailyData = [
  { day: "01", lucro: 180 },
  { day: "05", lucro: 220 },
  { day: "10", lucro: 150 },
  { day: "15", lucro: 280 },
  { day: "20", lucro: 200 },
  { day: "25", lucro: 320 },
  { day: "30", lucro: 250 },
];

const expenseCategories = [
  { name: "Combustível", value: 850, color: "hsl(48, 96%, 53%)" },
  { name: "Manutenção", value: 200, color: "hsl(142, 76%, 36%)" },
  { name: "Taxas App", value: 320, color: "hsl(0, 84%, 60%)" },
  { name: "Pedágio", value: 80, color: "hsl(217, 91%, 60%)" },
  { name: "Outros", value: 150, color: "hsl(0, 0%, 50%)" },
];

const kpis = [
  {
    title: "Receita Total",
    value: "R$ 4.850",
    change: "+12%",
    changeType: "positive" as const,
    icon: DollarSign,
  },
  {
    title: "Despesas",
    value: "R$ 1.600",
    change: "-5%",
    changeType: "positive" as const,
    icon: TrendingDown,
  },
  {
    title: "Lucro Líquido",
    value: "R$ 3.250",
    change: "+18%",
    changeType: "positive" as const,
    icon: TrendingUp,
  },
  {
    title: "Média/Dia",
    value: "R$ 162",
    change: "+8%",
    changeType: "positive" as const,
    icon: Calendar,
  },
];

export default function Dashboard() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Olá! Aqui está seu resultado deste mês.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => (
          <Card key={index} variant="elevated" className="hover:border-primary/20 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <kpi.icon className="w-5 h-5 text-primary" />
                </div>
                <span
                  className={cn(
                    "text-xs font-medium px-2 py-1 rounded-full",
                    kpi.changeType === "positive"
                      ? "bg-success/20 text-success"
                      : "bg-destructive/20 text-destructive"
                  )}
                >
                  {kpi.change}
                </span>
              </div>
              <p className="text-2xl font-bold">{kpi.value}</p>
              <p className="text-sm text-muted-foreground">{kpi.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Area Chart - Daily Profit */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="text-lg">Lucro Diário do Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData}>
                  <defs>
                    <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(48, 96%, 53%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(48, 96%, 53%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 20%)" />
                  <XAxis
                    dataKey="day"
                    stroke="hsl(0, 0%, 50%)"
                    tick={{ fill: "hsl(0, 0%, 60%)" }}
                  />
                  <YAxis
                    stroke="hsl(0, 0%, 50%)"
                    tick={{ fill: "hsl(0, 0%, 60%)" }}
                    tickFormatter={(value) => `R$${value}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(0, 0%, 10%)",
                      border: "1px solid hsl(0, 0%, 20%)",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`R$ ${value}`, "Lucro"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="lucro"
                    stroke="hsl(48, 96%, 53%)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorLucro)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart - Expense Categories */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="text-lg">Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center">
              <div className="w-1/2">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={expenseCategories}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {expenseCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(0, 0%, 10%)",
                        border: "1px solid hsl(0, 0%, 20%)",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [`R$ ${value}`, ""]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 space-y-3">
                {expenseCategories.map((category, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-sm text-muted-foreground">
                        {category.name}
                      </span>
                    </div>
                    <span className="text-sm font-medium">R$ {category.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
