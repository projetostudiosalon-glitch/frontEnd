import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import http from "../api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { ArrowLeft, Plus, Trash2, CheckCircle2, Edit2 } from "lucide-react";
import StatusBadge from "../components/StatusBadge";
import PasswordConfirmDialog from "../components/PasswordConfirmDialog";
import { toast } from "sonner";

const FORMAS = [
  { v: "dinheiro", l: "Dinheiro" },
  { v: "pix", l: "PIX" },
  { v: "cartao_credito", l: "Cartão Crédito" },
  { v: "cartao_debito", l: "Cartão Débito" },
  { v: "vale", l: "Vale-alimentação" },
];

const fmtBRL = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDT = (s) => new Date(s).toLocaleString("pt-BR");

export default function Pagamento() {
  const { id } = useParams();
  const nav = useNavigate();
  const [ag, setAg] = useState(null);
  const [novos, setNovos] = useState([{ valor: "", forma_pagamento: "dinheiro", observacao: "" }]);
  
  // Estados para edição de pagamento
  const [editingPayment, setEditingPayment] = useState(null);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // { type: 'edit' | 'delete', paymentId, newData? }

  const load = () => http.get(`/agendamentos/${id}`).then((r) => setAg(r.data));
  useEffect(() => { load(); }, [id]);

  if (!ag) return <div className="p-8 text-zinc-400">Carregando...</div>;
  const saldo = (ag.valor_total || 0) - (ag.total_pago || 0);

  const addLine = () => setNovos([...novos, { valor: "", forma_pagamento: "dinheiro", observacao: "" }]);
  const removeLine = (i) => setNovos(novos.filter((_, x) => x !== i));
  const updateLine = (i, k, v) => setNovos(novos.map((p, x) => x === i ? { ...p, [k]: v } : p));

  const submit = async (finalizar) => {
    const validos = novos.filter((p) => Number(p.valor) > 0);
    if (validos.length === 0) { toast.error("Informe ao menos um pagamento"); return; }
    const payload = { pagamentos: validos.map((p) => ({ valor: Number(p.valor), forma_pagamento: p.forma_pagamento, observacao: p.observacao })), finalizar };
    try {
      await http.post(`/agendamentos/${id}/pagamentos`, payload);
      toast.success(finalizar ? "Atendimento finalizado!" : "Pagamento registrado");
      if (finalizar) nav("/agenda"); else { setNovos([{ valor: "", forma_pagamento: "dinheiro", observacao: "" }]); load(); }
    } catch (e) { toast.error(e.response?.data?.detail || "Erro"); }
  };

  // Abrir modal de edição
  const openEditDialog = (payment) => {
    setEditingPayment({ ...payment });
    setEditFormOpen(true);
  };

  // Confirmar edição com senha
  const handleEditWithPassword = async (password) => {
    if (!editingPayment) return;
    try {
      await http.put(
        `/agendamentos/${id}/pagamentos/${editingPayment.id}`,
        {
          valor: Number(editingPayment.valor),
          forma_pagamento: editingPayment.forma_pagamento,
          observacao: editingPayment.observacao || ""
        },
        { params: { password } }
      );
      toast.success("Pagamento atualizado com sucesso");
      setEditFormOpen(false);
      setEditingPayment(null);
      setPasswordDialogOpen(false);
      load();
    } catch (e) {
      throw new Error(e.response?.data?.detail || "Erro ao atualizar pagamento");
    }
  };

  // Confirmar deleção com senha
  const handleDeleteWithPassword = async (password) => {
    if (!pendingAction?.paymentId) return;
    try {
      await http.delete(
        `/agendamentos/${id}/pagamentos/${pendingAction.paymentId}`,
        { params: { password } }
      );
      toast.success("Pagamento removido com sucesso");
      setPasswordDialogOpen(false);
      setPendingAction(null);
      load();
    } catch (e) {
      throw new Error(e.response?.data?.detail || "Erro ao remover pagamento");
    }
  };

  // Iniciar processo de edição
  const startEdit = (payment) => {
    openEditDialog(payment);
  };

  // Iniciar processo de deleção
  const startDelete = (paymentId) => {
    setPendingAction({ type: 'delete', paymentId });
    setPasswordDialogOpen(true);
  };

  // Salvar edição (abre dialog de senha)
  const saveEdit = () => {
    if (!editingPayment?.valor || Number(editingPayment.valor) <= 0) {
      toast.error("Valor deve ser maior que zero");
      return;
    }
    setPendingAction({ type: 'edit' });
    setPasswordDialogOpen(true);
  };

  return (
    <div className="p-6 lg:p-8 fade-in max-w-4xl">
      <Button variant="ghost" onClick={() => nav(-1)} className="mb-4"><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Button>
      <div className="text-xs uppercase tracking-wider text-zinc-400">Pagamento</div>
      <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">{ag.cliente_nome}</h1>
      <div className="text-sm text-zinc-500 mt-1">{fmtDT(ag.data_hora)} · <StatusBadge status={ag.status} /></div>

      <div className="grid grid-cols-3 gap-4 my-6">
        <div className="bg-white border border-zinc-200 rounded-xl p-5"><div className="text-xs uppercase tracking-wider text-zinc-400">Total</div><div className="font-display text-3xl font-semibold mt-1">{fmtBRL(ag.valor_total)}</div></div>
        <div className="bg-white border border-zinc-200 rounded-xl p-5"><div className="text-xs uppercase tracking-wider text-zinc-400">Pago</div><div className="font-display text-3xl font-semibold mt-1 text-emerald-600">{fmtBRL(ag.total_pago)}</div></div>
        <div className="bg-white border border-zinc-200 rounded-xl p-5"><div className="text-xs uppercase tracking-wider text-zinc-400">Saldo</div><div className={`font-display text-3xl font-semibold mt-1 ${saldo > 0.01 ? "text-amber-600" : "text-emerald-600"}`}>{fmtBRL(saldo)}</div></div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl p-6 mb-6">
        <h3 className="font-display text-lg font-medium mb-4">Registrar pagamento</h3>
        <div className="space-y-3">
          {novos.map((p, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-3"><Label>Valor</Label><Input data-testid={`pay-valor-${i}`} type="number" step="0.01" value={p.valor} onChange={(e) => updateLine(i, "valor", e.target.value)} /></div>
              <div className="col-span-4">
                <Label>Forma</Label>
                <Select value={p.forma_pagamento} onValueChange={(v) => updateLine(i, "forma_pagamento", v)}>
                  <SelectTrigger data-testid={`pay-forma-${i}`}><SelectValue /></SelectTrigger>
                  <SelectContent>{FORMAS.map((f) => <SelectItem key={f.v} value={f.v}>{f.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-4"><Label>Observação</Label><Input value={p.observacao} onChange={(e) => updateLine(i, "observacao", e.target.value)} /></div>
              <div className="col-span-1">{novos.length > 1 && <Button size="icon" variant="ghost" onClick={() => removeLine(i)}><Trash2 className="w-4 h-4 text-rose-500" /></Button>}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-4">
          <Button variant="outline" size="sm" onClick={addLine}><Plus className="w-3 h-3 mr-1" /> Adicionar forma</Button>
          <div className="flex gap-2">
            <Button data-testid="pay-save-btn" onClick={() => submit(false)} variant="outline">Registrar</Button>
            <Button data-testid="pay-finish-btn" onClick={() => submit(true)} className="bg-[#84A59D] hover:bg-[#6F9189]"><CheckCircle2 className="w-4 h-4 mr-1" /> Registrar e finalizar</Button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100"><h3 className="font-display text-lg font-medium">Pagamentos anteriores</h3></div>
        {ag.pagamentos.length === 0 ? <div className="p-6 text-center text-sm text-zinc-400">Nenhum pagamento</div> : (
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500"><tr><th className="px-4 py-3 text-left">Data</th><th className="px-4 py-3 text-left">Forma</th><th className="px-4 py-3 text-right">Valor</th><th className="px-4 py-3 text-right">Ações</th></tr></thead>
            <tbody className="divide-y divide-zinc-100">
              {ag.pagamentos.map((p) => (
                <tr key={p.id}><td className="px-4 py-3 text-zinc-700">{fmtDT(p.data_hora)}</td><td className="px-4 py-3">{FORMAS.find((f) => f.v === p.forma_pagamento)?.l || p.forma_pagamento}</td><td className="px-4 py-3 text-right font-medium">{fmtBRL(p.valor)}</td><td className="px-4 py-3 text-right space-x-2"><Button size="icon" variant="ghost" onClick={() => startEdit(p)}><Edit2 className="w-4 h-4 text-blue-500" /></Button><Button size="icon" variant="ghost" onClick={() => startDelete(p.id)}><Trash2 className="w-4 h-4 text-rose-500" /></Button></td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Dialog de edição de pagamento */}
      <Dialog open={editFormOpen} onOpenChange={setEditFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar pagamento</DialogTitle>
          </DialogHeader>
          {editingPayment && (
            <div className="space-y-4">
              <div>
                <Label>Valor</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingPayment.valor}
                  onChange={(e) => setEditingPayment({ ...editingPayment, valor: e.target.value })}
                />
              </div>
              <div>
                <Label>Forma de pagamento</Label>
                <Select value={editingPayment.forma_pagamento} onValueChange={(v) => setEditingPayment({ ...editingPayment, forma_pagamento: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FORMAS.map((f) => <SelectItem key={f.v} value={f.v}>{f.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Observação</Label>
                <Input
                  value={editingPayment.observacao}
                  onChange={(e) => setEditingPayment({ ...editingPayment, observacao: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditFormOpen(false)}>Cancelar</Button>
            <Button onClick={saveEdit} className="bg-[#84A59D] hover:bg-[#6F9189]">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de senha */}
      <PasswordConfirmDialog
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
        onConfirm={pendingAction?.type === 'delete' ? handleDeleteWithPassword : handleEditWithPassword}
        title={pendingAction?.type === 'delete' ? "Confirmar exclusão" : "Confirmar edição"}
        description={pendingAction?.type === 'delete' ? "Digite sua senha para remover este pagamento" : "Digite sua senha para atualizar este pagamento"}
      />
    </div>
  );
}
