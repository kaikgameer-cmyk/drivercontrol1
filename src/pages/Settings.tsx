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
import { User, Settings as SettingsIcon, Calendar, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { toast } = useToast();
  const [name, setName] = useState("João Silva");
  const [city, setCity] = useState("São Paulo");
  const [appsUsed, setAppsUsed] = useState("Uber, 99, InDrive");
  const [startWeekDay, setStartWeekDay] = useState("segunda");
  const [currency, setCurrency] = useState("BRL");

  const handleSave = () => {
    toast({
      title: "Configurações salvas",
      description: "Suas preferências foram atualizadas com sucesso.",
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie seu perfil e preferências
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Profile Card */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Perfil</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Sua cidade"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apps">Apps que você usa</Label>
              <Input
                id="apps"
                value={appsUsed}
                onChange={(e) => setAppsUsed(e.target.value)}
                placeholder="Ex: Uber, 99, InDrive"
              />
              <p className="text-xs text-muted-foreground">
                Separe por vírgula os apps que você trabalha
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Preferences Card */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Preferências</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Início da semana</Label>
              <Select value={startWeekDay} onValueChange={setStartWeekDay}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="segunda">Segunda-feira</SelectItem>
                  <SelectItem value="domingo">Domingo</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Define quando começa sua semana de trabalho
              </p>
            </div>
            <div className="space-y-2">
              <Label>Moeda</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">Real (R$)</SelectItem>
                  <SelectItem value="USD">Dólar (US$)</SelectItem>
                  <SelectItem value="EUR">Euro (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="text-lg">Resumo da Conta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Membro desde</p>
                <p className="font-semibold">Janeiro 2024</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total lançamentos</p>
                <p className="font-semibold">247</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <span className="text-success font-bold">$</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Lucro total</p>
                <p className="font-semibold text-success">R$ 12.450</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button variant="hero" size="lg" onClick={handleSave}>
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
