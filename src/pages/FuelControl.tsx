import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Fuel as FuelIcon, Gauge, DollarSign, TrendingUp } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Mock data
const fuelLogs = [
  { id: 1, date: "2024-01-28", station: "Shell", liters: 35, totalValue: 210.00, fuelType: "gasolina", odometer: 45200 },
  { id: 2, date: "2024-01-24", station: "Ipiranga", liters: 40, totalValue: 236.00, fuelType: "gasolina", odometer: 44800 },
  { id: 3, date: "2024-01-20", station: "BR", liters: 38, totalValue: 220.00, fuelType: "gasolina", odometer: 44350 },
  { id: 4, date: "2024-01-16", station: "Shell", liters: 42, totalValue: 248.00, fuelType: "gasolina", odometer: 43900 },
  { id: 5, date: "2024-01-12", station: "Ipiranga", liters: 36, totalValue: 210.00, fuelType: "gasolina", odometer: 43450 },
];

const priceHistory = [
  { date: "01/01", price: 5.80 },
  { date: "08/01", price: 5.85 },
  { date: "15/01", price: 5.79 },
  { date: "22/01", price: 5.90 },
  { date: "29/01", price: 6.00 },
];

const weeklySpending = [
  { week: "Sem 1", value: 420 },
  { week: "Sem 2", value: 480 },
  { week: "Sem 3", value: 456 },
  { week: "Sem 4", value: 446 },
];

export default function FuelControl() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Calculate metrics
  const avgConsumption = 11.5; // km/l (mock)
  const avgPricePerLiter = 5.87; // R$/l (mock)
  const costPerKm = avgPricePerLiter / avgConsumption;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Combustível</h1>
          <p className="text-muted-foreground">
            Controle seus abastecimentos e consumo
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="hero" size="lg">
              <Plus className="w-5 h-5" />
              Novo Abastecimento
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Registrar Abastecimento</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input type="date" />
                </div>
                <div className="space-y-2">
                  <Label>Posto (opcional)</Label>
                  <Input placeholder="Ex: Shell" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Litros</Label>
                  <Input type="number" step="0.01" placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label>Valor Total</Label>
                  <Input type="number" step="0.01" placeholder="0.00" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tipo de combustível</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gasolina">Gasolina</SelectItem>
                    <SelectItem value="etanol">Etanol</SelectItem>
                    <SelectItem value="diesel">Diesel</SelectItem>
                    <SelectItem value="gnv">GNV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quilometragem atual</Label>
                <Input type="number" placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Método de pagamento</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="debito">Débito</SelectItem>
                    <SelectItem value="credito">Cartão de Crédito</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button variant="hero" className="w-full">
              Salvar Abastecimento
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="elevated">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Gauge className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">Consumo Médio</span>
            </div>
            <p className="text-2xl font-bold">{avgConsumption.toFixed(1)} km/l</p>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FuelIcon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">Preço Médio/Litro</span>
            </div>
            <p className="text-2xl font-bold">R$ {avgPricePerLiter.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">Custo por Km</span>
            </div>
            <p className="text-2xl font-bold">R$ {costPerKm.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">Total do Mês</span>
            </div>
            <p className="text-2xl font-bold">R$ 1.124</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Price History */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="text-lg">Evolução do Preço por Litro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={priceHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 20%)" />
                  <XAxis
                    dataKey="date"
                    stroke="hsl(0, 0%, 50%)"
                    tick={{ fill: "hsl(0, 0%, 60%)" }}
                  />
                  <YAxis
                    stroke="hsl(0, 0%, 50%)"
                    tick={{ fill: "hsl(0, 0%, 60%)" }}
                    tickFormatter={(value) => `R$${value.toFixed(2)}`}
                    domain={[5.5, 6.2]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(0, 0%, 10%)",
                      border: "1px solid hsl(0, 0%, 20%)",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`R$ ${value.toFixed(2)}`, "Preço"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="hsl(48, 96%, 53%)"
                    strokeWidth={2}
                    dot={{ fill: "hsl(48, 96%, 53%)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Spending */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="text-lg">Gasto Semanal com Combustível</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklySpending}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 20%)" />
                  <XAxis
                    dataKey="week"
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
                    formatter={(value: number) => [`R$ ${value}`, "Gasto"]}
                  />
                  <Bar dataKey="value" fill="hsl(48, 96%, 53%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fuel Logs Table */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="text-lg">Histórico de Abastecimentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Data</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Posto</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Tipo</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Litros</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">R$/L</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Total</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Km</th>
                </tr>
              </thead>
              <tbody>
                {fuelLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                  >
                    <td className="py-3 px-4 text-sm">
                      {new Date(log.date).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="py-3 px-4 text-sm">{log.station}</td>
                    <td className="py-3 px-4 text-sm capitalize">{log.fuelType}</td>
                    <td className="py-3 px-4 text-sm text-right">{log.liters.toFixed(1)}</td>
                    <td className="py-3 px-4 text-sm text-right">
                      R$ {(log.totalValue / log.liters).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-medium text-primary">
                      R$ {log.totalValue.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-muted-foreground">
                      {log.odometer.toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
