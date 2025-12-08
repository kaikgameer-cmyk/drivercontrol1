import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, CreditCard as CardIcon, DollarSign, Calendar, Percent } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

// Mock data
const creditCards = [
  {
    id: 1,
    name: "Nubank",
    lastDigits: "4523",
    brand: "Mastercard",
    limit: 5000,
    spent: 1250,
    dueDay: 10,
    bestPurchaseDay: 25,
  },
  {
    id: 2,
    name: "C6 Bank",
    lastDigits: "8891",
    brand: "Visa",
    limit: 3000,
    spent: 680,
    dueDay: 15,
    bestPurchaseDay: 1,
  },
  {
    id: 3,
    name: "Inter",
    lastDigits: "2234",
    brand: "Mastercard",
    limit: 2000,
    spent: 320,
    dueDay: 5,
    bestPurchaseDay: 20,
  },
];

const expensesByCategory = [
  { name: "Combustível", value: 850 },
  { name: "Manutenção", value: 320 },
  { name: "Pedágio", value: 180 },
  { name: "Outros", value: 150 },
];

const COLORS = [
  "hsl(48, 96%, 53%)",
  "hsl(142, 76%, 36%)",
  "hsl(0, 84%, 60%)",
  "hsl(0, 0%, 50%)",
];

export default function CreditCards() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const totalLimit = creditCards.reduce((acc, card) => acc + card.limit, 0);
  const totalSpent = creditCards.reduce((acc, card) => acc + card.spent, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Cartões de Crédito</h1>
          <p className="text-muted-foreground">
            Gerencie seus cartões e acompanhe suas faturas
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="hero" size="lg">
              <Plus className="w-5 h-5" />
              Novo Cartão
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Adicionar Cartão</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Nome do cartão</Label>
                <Input placeholder="Ex: Nubank" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Últimos 4 dígitos</Label>
                  <Input placeholder="0000" maxLength={4} />
                </div>
                <div className="space-y-2">
                  <Label>Bandeira</Label>
                  <Input placeholder="Visa, Mastercard..." />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Limite</Label>
                <Input type="number" placeholder="0.00" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Melhor dia de compra</Label>
                  <Input type="number" min={1} max={31} placeholder="1" />
                </div>
                <div className="space-y-2">
                  <Label>Dia de vencimento</Label>
                  <Input type="number" min={1} max={31} placeholder="10" />
                </div>
              </div>
            </div>
            <Button variant="hero" className="w-full">
              Salvar Cartão
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card variant="elevated">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">Limite Total</span>
            </div>
            <p className="text-2xl font-bold">R$ {totalLimit.toLocaleString("pt-BR")}</p>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <CardIcon className="w-5 h-5 text-destructive" />
              </div>
              <span className="text-sm text-muted-foreground">Total Gasto</span>
            </div>
            <p className="text-2xl font-bold">R$ {totalSpent.toLocaleString("pt-BR")}</p>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Percent className="w-5 h-5 text-success" />
              </div>
              <span className="text-sm text-muted-foreground">Limite Disponível</span>
            </div>
            <p className="text-2xl font-bold">
              {((1 - totalSpent / totalLimit) * 100).toFixed(0)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cards Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {creditCards.map((card) => (
          <Card key={card.id} variant="elevated" className="hover:border-primary/30 transition-colors">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{card.name}</CardTitle>
                <span className="text-xs text-muted-foreground">{card.brand}</span>
              </div>
              <p className="text-sm text-muted-foreground">•••• {card.lastDigits}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Usado</span>
                  <span className="font-medium">R$ {card.spent.toLocaleString("pt-BR")}</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-primary rounded-full transition-all"
                    style={{ width: `${(card.spent / card.limit) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Limite: R$ {card.limit.toLocaleString("pt-BR")}</span>
                  <span>{((card.spent / card.limit) * 100).toFixed(0)}%</span>
                </div>
              </div>

              {/* Card details */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Melhor compra</p>
                  <p className="font-medium">Dia {card.bestPurchaseDay}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Vencimento</p>
                  <p className="font-medium">Dia {card.dueDay}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Expenses by Category */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="text-lg">Gastos por Categoria (Cartões)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="w-full md:w-1/2 h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {expensesByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
            <div className="w-full md:w-1/2 space-y-3">
              {expensesByCategory.map((category, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm">{category.name}</span>
                  </div>
                  <span className="font-medium">R$ {category.value}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
