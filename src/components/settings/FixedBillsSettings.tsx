import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useFixedBills, FixedBill } from "@/hooks/useFixedBills";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Calendar,
  DollarSign,
  Loader2,
  Receipt
} from "lucide-react";
import { format } from "date-fns";
import { z } from "zod";

const fixedBillSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100),
  amount: z.number().positive("Valor deve ser positivo"),
  due_day: z.number().min(1).max(31).nullable(),
  recurrence: z.enum(["monthly", "weekly", "yearly"]),
});

export function FixedBillsSettings() {
  const { 
    fixedBills, 
    isLoading, 
    createFixedBill, 
    updateFixedBill, 
    deleteFixedBill,
    toggleFixedBillActive,
    generateMonthInstances
  } = useFixedBills();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<FixedBill | null>(null);
  const [deletingBillId, setDeletingBillId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState<string>("");
  const [recurrence, setRecurrence] = useState("monthly");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setName("");
    setAmount("");
    setDueDay("");
    setRecurrence("monthly");
    setFormErrors({});
    setEditingBill(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (bill: FixedBill) => {
    setEditingBill(bill);
    setName(bill.name);
    setAmount(bill.amount.toString());
    setDueDay(bill.due_day?.toString() || "");
    setRecurrence(bill.recurrence);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    setFormErrors({});

    const data = {
      name: name.trim(),
      amount: parseFloat(amount) || 0,
      due_day: dueDay ? parseInt(dueDay) : null,
      recurrence: recurrence as "monthly" | "weekly" | "yearly",
    };

    const result = fixedBillSchema.safeParse(data);

    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0].toString()] = err.message;
        }
      });
      setFormErrors(errors);
      return;
    }

    if (editingBill) {
      updateFixedBill.mutate(
        { id: editingBill.id, ...data },
        {
          onSuccess: () => {
            setIsModalOpen(false);
            resetForm();
          },
        }
      );
    } else {
      createFixedBill.mutate(
        { ...data, start_date: format(new Date(), "yyyy-MM-dd") },
        {
          onSuccess: () => {
            setIsModalOpen(false);
            resetForm();
          },
        }
      );
    }
  };

  const handleDelete = () => {
    if (deletingBillId) {
      deleteFixedBill.mutate(deletingBillId, {
        onSuccess: () => {
          setIsDeleteDialogOpen(false);
          setDeletingBillId(null);
        },
      });
    }
  };

  const confirmDelete = (id: string) => {
    setDeletingBillId(id);
    setIsDeleteDialogOpen(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Despesas Fixas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            Despesas Fixas
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => generateMonthInstances.mutate(new Date())}
              disabled={generateMonthInstances.isPending}
            >
              {generateMonthInstances.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Calendar className="w-4 h-4" />
              )}
              <span className="hidden sm:inline ml-2">Gerar Instâncias</span>
            </Button>
            <Button size="sm" onClick={openCreateModal}>
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline ml-2">Nova</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {fixedBills.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">Você ainda não tem despesas fixas</p>
              <p className="text-sm mt-1">
                Cadastre suas despesas recorrentes para melhor controle
              </p>
              <Button 
                className="mt-4" 
                variant="outline" 
                onClick={openCreateModal}
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar despesa fixa
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {fixedBills.map((bill) => (
                <div
                  key={bill.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    bill.is_active 
                      ? "bg-card border-border" 
                      : "bg-muted/30 border-muted opacity-60"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{bill.name}</span>
                      {!bill.is_active && (
                        <Badge variant="secondary" className="text-xs">
                          Inativa
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {formatCurrency(bill.amount)}
                      </span>
                      {bill.due_day && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Dia {bill.due_day}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={bill.is_active}
                      onCheckedChange={(checked) =>
                        toggleFixedBillActive.mutate({ 
                          id: bill.id, 
                          is_active: checked 
                        })
                      }
                      className="data-[state=checked]:bg-primary"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditModal(bill)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => confirmDelete(bill.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingBill ? "Editar" : "Nova"} Despesa Fixa
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                placeholder="Ex: Aluguel, Internet, etc."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={formErrors.name ? "border-destructive" : ""}
              />
              {formErrors.name && (
                <p className="text-sm text-destructive">{formErrors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Valor *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={formErrors.amount ? "border-destructive" : ""}
              />
              {formErrors.amount && (
                <p className="text-sm text-destructive">{formErrors.amount}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="due_day">Dia de Vencimento</Label>
                <Select value={dueDay} onValueChange={setDueDay}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                      <SelectItem key={day} value={day.toString()}>
                        Dia {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recurrence">Frequência</Label>
                <Select value={recurrence} onValueChange={setRecurrence}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createFixedBill.isPending || updateFixedBill.isPending}
            >
              {(createFixedBill.isPending || updateFixedBill.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {editingBill ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir despesa fixa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todas as instâncias associadas 
              também serão removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteFixedBill.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
