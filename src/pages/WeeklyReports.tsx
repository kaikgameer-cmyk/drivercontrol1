import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendingUp, TrendingDown, DollarSign, Clock, Calendar } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Mock data
const weeklyProfitData = [
  { day: "Seg", lucro: 180 },
  { day: "Ter", lucro: 220 },
  { day: "Qua", lucro: 150 },
  { day: "Qui", lucro: 280 },
  { day: "Sex", lucro: 320 },
  { day: "Sáb", lucro: 380 },
  { day: "Dom", lucro: 250 },
];

const revenueExpenseData = [
  { day: "Seg", receita: 280, despesa: 100 },
  { day: "Ter", receita: 350, despesa: 130 },
  { day: "Qua", receita: 250, despesa: 100 },
  { day: "Qui", receita: 400, despesa: 120 },
  { day: "Sex", receita: 450, despesa: 130 },
  { day: "Sáb", receita: 520, despesa: 140 },
  { day: "Dom", receita: 380, despesa: 130 },
];

const expenseCategories = [
  { name: "Combustível", value: 380, color: "hsl(48, 96%, 53%)" },
  { name: "Manutenção", value: 80, color: "hsl(142, 76%, 36%)" },
  { name: "Taxas App", value: 150, color: "hsl(0, 84%, 60%)" },
  { name: "Pedágio", value: 40, color: "hsl(217, 91%, 60%)" },
  { name: "Outros", value: 100, color: "hsl(0, 0%, 50%)" },
];

const weeks = [
  { value: "1", label: "Semana 1 (01–07)" },
  { value: "2", label: "Semana 2 (08–14)" },
  { value: "3", label: "Semana 3 (15–21)" },
  { value: "4", label: "Semana 4 (22–28)" },
];

export default function WeeklyReports() {
  const [selectedWeek, setSelectedWeek] = useState("4");

  const kpis = [
    { title: "Receita", value: "R$ 2.630", icon: DollarSign },
    { title: "Despesas", value: "R$ 750", icon: TrendingDown },
    { title: "Lucro", value: "R$ 1.880", icon: TrendingUp, highlight: true },
    { title: "Dias rodados", value: "7", icon: Calendar },
    { title: "Média/dia", value: "R$ 268", icon: Clock },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Relatórios Semanais</h1>
          <p className="text-muted-foreground">
            Acompanhe seu desempenho semana a semana
          </p>
        </div>
        <Select value={selectedWeek} onValueChange={setSelectedWeek}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Selecione a semana" />
          </SelectTrigger>
          <SelectContent>
            {weeks.map((week) => (
              <SelectItem key={week.value} value={week.value}>
                {week.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map((kpi, index) => (
          <Card
            key={index}
            variant={kpi.highlight ? "elevated" : "default"}
            className={kpi.highlight ? "bg-gradient-card border-primary/30" : ""}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <kpi.icon className={`w-4 h-4 ${kpi.highlight ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-xs text-muted-foreground">{kpi.title}</span>
              </div>
              <p className={`text-xl font-bold ${kpi.highlight ? "text-primary" : ""}`}>
                {kpi.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Daily Profit Bar Chart */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="text-lg">Lucro por Dia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyProfitData}>
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
                  <Bar
                    dataKey="lucro"
                    fill="hsl(48, 96%, 53%)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue vs Expense Stacked Bar */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="text-lg">Receitas vs Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueExpenseData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 20%)" />
                  <XAxis
                    dataKey="day"
                    stroke="hsl(0, 0%, 50%)"
                    tick={{ fill: "hsl(0, 0%, 60%)" }}
                  />
                  <YAxis
                    stroke="hsl(0, 0%, 50%)"
                    tick={{ fill: "hsl(0, 0%, 60%)" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(0, 0%, 10%)",
                      border: "1px solid hsl(0, 0%, 20%)",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="receita" fill="hsl(142, 76%, 36%)" stackId="a" radius={[0, 0, 0, 0]} name="Receita" />
                  <Bar dataKey="despesa" fill="hsl(0, 84%, 60%)" stackId="a" radius={[4, 4, 0, 0]} name="Despesa" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Expense Distribution */}
        <Card variant="elevated" className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Distribuição de Despesas da Semana</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-full md:w-1/2 h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseCategories}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
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
              <div className="w-full md:w-1/2 grid grid-cols-2 gap-4">
                {expenseCategories.map((category, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg bg-secondary/30 border border-border/50"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-sm text-muted-foreground">
                        {category.name}
                      </span>
                    </div>
                    <p className="text-lg font-semibold">R$ {category.value}</p>
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
