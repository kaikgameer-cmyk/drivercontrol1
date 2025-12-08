import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { 
  Shield, 
  Users, 
  Crown, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle
} from "lucide-react";
import { Navigate } from "react-router-dom";

interface Subscription {
  id: string;
  user_id: string;
  plan_name: string;
  billing_interval: string;
  status: string;
  current_period_end: string;
  created_at: string;
  profiles?: { name: string | null; user_id: string } | null;
}

interface Profile {
  user_id: string;
  name: string | null;
  email?: string;
}

export default function AdminPage() {
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);

  // Form state
  const [formEmail, setFormEmail] = useState("");
  const [formPlan, setFormPlan] = useState<"month" | "quarter" | "year">("month");
  const [formStatus, setFormStatus] = useState<"active" | "past_due" | "canceled">("active");
  const [formMonths, setFormMonths] = useState("12");

  // Fetch all subscriptions with profile info
  const { data: subscriptions = [], isLoading: subsLoading } = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: async () => {
      // First get all subscriptions
      const { data: subs, error } = await supabase
        .from("subscriptions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Then get profiles for each subscription
      const userIds = subs.map(s => s.user_id);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, name")
        .in("user_id", userIds);

      // Map profiles to subscriptions
      return subs.map(sub => ({
        ...sub,
        profiles: profilesData?.find(p => p.user_id === sub.user_id) || null
      })) as Subscription[];
    },
    enabled: isAdmin,
  });

  // Fetch all profiles
  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, name");

      if (error) throw error;
      return data as Profile[];
    },
    enabled: isAdmin,
  });

  // Create subscription mutation
  const createMutation = useMutation({
    mutationFn: async ({ email, plan, status, months }: { email: string; plan: string; status: string; months: number }) => {
      // First find user by email
      const { data: userData, error: userError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("user_id", email)
        .maybeSingle();

      // Try to get user from auth (need to use a workaround)
      const { data: authData } = await supabase.auth.admin?.listUsers?.() || { data: null };
      
      let userId = userData?.user_id;
      
      if (!userId) {
        throw new Error("Usuário não encontrado. Verifique o email.");
      }

      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + months);

      const planNames: Record<string, string> = {
        month: "Plano Mensal",
        quarter: "Plano Trimestral",
        year: "Plano Anual"
      };

      const { error } = await supabase
        .from("subscriptions")
        .insert([{
          user_id: userId,
          kiwify_subscription_id: `admin_${Date.now()}`,
          kiwify_product_id: "admin_created",
          plan_name: planNames[plan],
          billing_interval: plan as "month" | "quarter" | "year",
          status: status as "active" | "past_due" | "canceled",
          current_period_end: periodEnd.toISOString(),
          last_event: "admin_created"
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
      toast({ title: "Assinatura criada com sucesso!" });
      setCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar assinatura", description: error.message, variant: "destructive" });
    }
  });

  // Update subscription mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, status, months }: { id: string; status: string; months?: number }) => {
      const updateData: Record<string, unknown> = { status };
      
      if (months) {
        const periodEnd = new Date();
        periodEnd.setMonth(periodEnd.getMonth() + months);
        updateData.current_period_end = periodEnd.toISOString();
      }

      const { error } = await supabase
        .from("subscriptions")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
      toast({ title: "Assinatura atualizada!" });
      setEditingSubscription(null);
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    }
  });

  // Delete subscription mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("subscriptions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
      toast({ title: "Assinatura removida!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormEmail("");
    setFormPlan("month");
    setFormStatus("active");
    setFormMonths("12");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/20 text-green-500"><CheckCircle className="w-3 h-3 mr-1" />Ativa</Badge>;
      case "past_due":
        return <Badge className="bg-yellow-500/20 text-yellow-500"><AlertTriangle className="w-3 h-3 mr-1" />Pendente</Badge>;
      case "canceled":
        return <Badge className="bg-red-500/20 text-red-500"><XCircle className="w-3 h-3 mr-1" />Cancelada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      sub.profiles?.name?.toLowerCase().includes(searchLower) ||
      sub.plan_name.toLowerCase().includes(searchLower) ||
      sub.status.toLowerCase().includes(searchLower)
    );
  });

  if (adminLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Painel Admin</h1>
          <p className="text-muted-foreground">Gerenciar assinaturas e usuários</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{subscriptions.length}</p>
                <p className="text-sm text-muted-foreground">Total Assinaturas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{subscriptions.filter(s => s.status === "active").length}</p>
                <p className="text-sm text-muted-foreground">Ativas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{subscriptions.filter(s => s.status === "past_due").length}</p>
                <p className="text-sm text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <XCircle className="w-8 h-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{subscriptions.filter(s => s.status === "canceled").length}</p>
                <p className="text-sm text-muted-foreground">Canceladas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Assinaturas</CardTitle>
              <CardDescription>Gerencie todas as assinaturas do sistema</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {subsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Válido até</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscriptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhuma assinatura encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSubscriptions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                            <Crown className="w-4 h-4 text-primary" />
                          </div>
                          <span>{sub.profiles?.name || "Usuário"}</span>
                        </div>
                      </TableCell>
                      <TableCell>{sub.plan_name}</TableCell>
                      <TableCell>{getStatusBadge(sub.status)}</TableCell>
                      <TableCell>
                        {format(new Date(sub.current_period_end), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {format(new Date(sub.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => setEditingSubscription(sub)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Editar Assinatura</DialogTitle>
                                <DialogDescription>
                                  Alterar status ou período da assinatura
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label>Status</Label>
                                  <Select 
                                    value={formStatus} 
                                    onValueChange={(v) => setFormStatus(v as typeof formStatus)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="active">Ativa</SelectItem>
                                      <SelectItem value="past_due">Pendente</SelectItem>
                                      <SelectItem value="canceled">Cancelada</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Estender por (meses)</Label>
                                  <Input
                                    type="number"
                                    value={formMonths}
                                    onChange={(e) => setFormMonths(e.target.value)}
                                    min="0"
                                    max="24"
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button
                                  onClick={() => updateMutation.mutate({
                                    id: sub.id,
                                    status: formStatus,
                                    months: parseInt(formMonths) || undefined
                                  })}
                                  disabled={updateMutation.isPending}
                                >
                                  {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                  Salvar
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm("Tem certeza que deseja remover esta assinatura?")) {
                                deleteMutation.mutate(sub.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
