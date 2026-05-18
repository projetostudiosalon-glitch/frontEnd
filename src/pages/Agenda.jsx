import { useState, useEffect, useMemo } from "react";
import http from "../api";
import { PageHeader, EmptyState } from "../components/Page";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import StatusBadge, { STATUS_LABELS } from "../components/StatusBadge";
import { Calendar as CalIcon, Plus, ChevronLeft, ChevronRight, Trash2, Edit2, CreditCard, CalendarDays, X, User, Users } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import AgendaTimeline from "../components/AgendaTimeline";
import "./Agenda.css";

const fmtBRL = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtHour = (s) => new Date(s).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

const toDateInput = (d) => d.toISOString().split("T")[0];

export default function Agenda() {
  const today = useMemo(() => new Date(), []);
  const [data, setData] = useState(toDateInput(today));
  const [view, setView] = useState("dia");
  const [monthCursor, setMonthCursor] = useState({ y: today.getFullYear(), m: today.getMonth() + 1 });
  const [agendamentos, setAgendamentos] = useState([]);
  const [monthEvents, setMonthEvents] = useState({});
  const [clientes, setClientes] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(null);
  const [openSenha, setOpenSenha] = useState(false);
  const [senhaData, setSenhaData] = useState({ agendamento_id: null, novo_status: null, email: "", senha: "" });
  const [carregandoSenha, setCarregandoSenha] = useState(false);
  const nav = useNavigate();

  const loadDay = (d) => http.get("/agendamentos", { params: { data: d } }).then((r) => setAgendamentos(r.data || []));

  const loadMonth = (y, m) => {
    const ms = `${y}-${String(m).padStart(2, "0")}`;
    return http.get("/agendamentos", { params: { mes: ms } }).then((r) => {
      const map = {};
      const dados = r.data || [];
      dados.forEach((a) => {
        const day = a.data_hora.slice(8, 10);
        map[day] = (map[day] || 0) + 1;
      });
      setMonthEvents(map);
    });
  };

  useEffect(() => {
    Promise.all([
      loadDay(data),
      loadMonth(today.getFullYear(), today.getMonth() + 1),
      http.get("/clientes").then((r) => setClientes(r.data || [])),
      http.get("/servicos").then((r) => setServicos(r.data || [])),
      http.get("/colaboradores").then((r) => setColaboradores(r.data || [])),
    ]);
  }, []);

  useEffect(() => {
    loadDay(data);
  }, [data]);

  useEffect(() => {
    loadMonth(monthCursor.y, monthCursor.m);
  }, [monthCursor]);

  const save = async () => {
    if (!form.cliente_id) {
      toast.error("Selecione um cliente");
      return;
    }
    if (!form.data_hora) {
      toast.error("Selecione data e hora");
      return;
    }
    if (form.itens_selecionados.length === 0) {
      toast.error("Adicione pelo menos um serviço");
      return;
    }
    try {
      if (form.id) {
        await http.put(`/agendamentos/${form.id}`, form);
        toast.success("Agendamento atualizado");
      } else {
        await http.post("/agendamentos", form);
        toast.success("Agendamento criado");
      }
      setOpen(false);
      setForm(null);
      loadDay(data);
      loadMonth(monthCursor.y, monthCursor.m);
    } catch (e) {
      toast.error(e.response.data.detail || "Erro ao salvar agendamento");
    }
  };

  const del = async (id) => {
    if (!window.confirm("Excluir agendamento?")) return;
    await http.delete(`/agendamentos/${id}`);
    loadDay(data);
    loadMonth(monthCursor.y, monthCursor.m);
  };

  const changeStatus = async (id, status, agendamento) => {
    if (agendamento?.status === "concluido" && status !== "concluido") {
      setSenhaData({ agendamento_id: id, novo_status: status, email: "", senha: "" });
      setOpenSenha(true);
      return;
    }

    if (status === "concluido") {
      try {
        const agendamentoResponse = await http.get(`/agendamentos/${id}`);
        const agendamento = agendamentoResponse.data;
        const totalPago = agendamento.total_pago || 0;
        if (totalPago < agendamento.valor_total - 0.01) {
          toast.error("Agendamento não está totalmente pago. Registre o pagamento antes de concluir.");
          setTimeout(() => {
            nav(`/agendamentos/${id}/pagamento`);
          }, 1500);
          return;
        }
        await http.post(`/agendamentos/${id}/status`, { status });
        toast.success("Agendamento concluído");
        loadDay(data);
        loadMonth(monthCursor.y, monthCursor.m);
      } catch (e) {
        const errorMsg = e.response?.data?.detail || e.message || "Erro ao atualizar status";
        console.error("Erro ao marcar como concluído:", e.response?.data);
        toast.error(errorMsg);
      }
      return;
    }

    try {
      await http.post(`/agendamentos/${id}/status`, { status });
      toast.success("Status atualizado");
      loadDay(data);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao atualizar status");
    }
  };

  const confirmarMudancaStatus = async () => {
    if (!senhaData.email) {
      toast.error("Digite seu email");
      return;
    }
    if (!senhaData.senha) {
      toast.error("Digite sua senha");
      return;
    }

    setCarregandoSenha(true);
    try {
      console.log("Alterando status com credenciais...");
      await http.post(`/agendamentos/${senhaData.agendamento_id}/status`, {
        status: senhaData.novo_status,
        senha: senhaData.senha
      });
      console.log("Status alterado com sucesso!");
      toast.success("Status atualizado com sucesso");
      setOpenSenha(false);
      setSenhaData({ agendamento_id: null, novo_status: null, email: "", senha: "" });
      loadDay(data);
      loadMonth(monthCursor.y, monthCursor.m);
      return;
    } catch (e) {
      let errorMsg = "Erro ao alterar status";
      if (e.response?.data?.detail) {
        errorMsg = typeof e.response.data.detail === "string" ? e.response.data.detail : JSON.stringify(e.response.data.detail);
      } else if (e.message) {
        errorMsg = e.message;
      }
      console.error("Erro ao alterar status:", errorMsg);
      toast.error(errorMsg);
    } finally {
      setCarregandoSenha(false);
    }
  };

  const addServico = (sid) => {
    const s = servicos.find(x => x.id === sid);
    if (!s) return;
    setForm(f => ({
      ...f,
      itens_selecionados: [...f.itens_selecionados, { servico_id: sid, colaborador_id: "", auxiliar_id: "" }]
    }));
  };

  const removeServico = (index) => {
    setForm(f => ({
      ...f,
      itens_selecionados: f.itens_selecionados.filter((_, i) => i !== index)
    }));
  };

  const updateItemColab = (index, cid) => {
    setForm(f => {
      const itens = [...f.itens_selecionados];
      itens[index].colaborador_id = cid;
      return { ...f, itens_selecionados: itens };
    });
  };

  const updateItemAux = (index, cid) => {
    setForm(f => {
      const itens = [...f.itens_selecionados];
      itens[index].auxiliar_id = cid;
      return { ...f, itens_selecionados: itens };
    });
  };

  const openNew = () => {
    setForm({
      cliente_id: "",
      data_hora: "",
      itens_selecionados: [],
      observacoes: ""
    });
    setOpen(true);
  };

  const openEdit = (a) => {
    setForm({
      id: a.id,
      cliente_id: a.cliente_id,
      data_hora: a.data_hora,
      itens_selecionados: a.itens || [],
      observacoes: a.observacoes || ""
    });
    setOpen(true);
  };

  const valorTotal = form?.itens_selecionados.reduce((sum, item) => {
    const s = servicos.find(x => x.id === item.servico_id);
    return sum + (s?.valor || 0);
  }, 0) || 0;

  const duracaoTotal = form?.itens_selecionados.reduce((sum, item) => {
    const s = servicos.find(x => x.id === item.servico_id);
    return sum + (s?.duracao_minutos || 0);
  }, 0) || 0;

  return (
    <div className="agenda-container">
      <PageHeader title="Agenda" />
      <div className="view-toggle mb-4">
        <button className={`view-toggle-btn ${view === "dia" ? "view-toggle-btn-active" : ""}`} onClick={() => setView("dia")}>Dia</button>
        <button className={`view-toggle-btn ${view === "timeline" ? "view-toggle-btn-active" : ""}`} onClick={() => setView("timeline")}>Timeline</button>
        <button className={`view-toggle-btn ${view === "calendario" ? "view-toggle-btn-active" : ""}`} onClick={() => setView("calendario")}>Calendário</button>
        <button className="btn-primary ml-auto" onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Novo</button>
      </div>

      {view === "dia" ? (
        <>
          <div className="flex items-center gap-2 mb-4">
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} className="w-40" />
          </div>
          {agendamentos.length === 0 ? (
            <EmptyState title="Sem agendamentos" description="Nenhum agendamento para este dia" />
          ) : (
            <div className="space-y-2">
              {agendamentos.map((a) => (
                <div key={a.id} className="agenda-card fade-in">
                  <div className="agenda-time">
                    <div className="agenda-time-hour">{fmtHour(a.data_hora).split(":")[0]}</div>
                    <div className="agenda-time-duration">{fmtHour(a.data_hora)}</div>
                  </div>
                  <div className="agenda-content">
                    <div className="agenda-client-name">{a.cliente_nome}</div>
                    <div className="agenda-services">{a.itens?.map((i) => servicos.find(s => s.id === i.servico_id)?.nome).join(", ")}</div>
                    <div className="agenda-professionals">{a.itens?.map((i) => colaboradores.find(c => c.id === i.colaborador_id)?.nome).filter(Boolean).join(", ")}</div>
                  </div>
                  <div className="agenda-price">
                    <div className="agenda-price-value">{fmtBRL(a.valor_total)}</div>
                    <div className="mt-1"><StatusBadge status={a.status} /></div>
                  </div>
                  <div className="agenda-actions">
                    <Select value={a.status || "agendado"} onValueChange={(v) => changeStatus(a.id, v, a)}>
                      <SelectTrigger className="w-36 h-8 text-xs" data-testid={`status-select-${a.id}`}><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(STATUS_LABELS).filter(([k]) => k && k.trim()).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button size="sm" variant="ghost" onClick={() => nav(`/agendamentos/${a.id}/pagamento`)} title="Pagamento"><CreditCard className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(a)}><Edit2 className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => del(a.id)}><Trash2 className="w-4 h-4 text-rose-500" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : view === "timeline" ? (
        <AgendaTimeline data={data} servicos={servicos} colaboradores={colaboradores} />
      ) : (
        <>
          <div className="flex items-center gap-2 mb-4">
            <Button size="sm" variant="outline" onClick={() => setMonthCursor(m => ({ ...m, m: m.m === 1 ? 12 : m.m - 1, y: m.m === 1 ? m.y - 1 : m.y }))}><ChevronLeft className="w-4 h-4" /></Button>
            <span className="text-sm font-semibold text-center min-w-[150px]" style={{ color: "#3A4F4A" }}>{new Date(monthCursor.y, monthCursor.m - 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</span>
            <Button size="sm" variant="outline" onClick={() => setMonthCursor(m => ({ ...m, m: m.m === 12 ? 1 : m.m + 1, y: m.m === 12 ? m.y + 1 : m.y }))}><ChevronRight className="w-4 h-4" /></Button>
          </div>
          <div className="month-grid">
            <div className="weekday-header">Dom</div>
            <div className="weekday-header">Seg</div>
            <div className="weekday-header">Ter</div>
            <div className="weekday-header">Qua</div>
            <div className="weekday-header">Qui</div>
            <div className="weekday-header">Sex</div>
            <div className="weekday-header">Sab</div>
            {(() => {
              const firstDay = new Date(monthCursor.y, monthCursor.m - 1, 1).getDay();
              const daysInMonth = new Date(monthCursor.y, monthCursor.m, 0).getDate();
              const days = [];
              for (let i = 0; i < firstDay; i++) days.push(null);
              for (let i = 1; i <= daysInMonth; i++) days.push(i);
              return days.map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`}></div>;
                const isToday = day === today.getDate() && monthCursor.m === today.getMonth() + 1 && monthCursor.y === today.getFullYear();
                const hasEvents = monthEvents[String(day).padStart(2, "0")] > 0;
                return (
                  <button
                    key={day}
                    onClick={() => setData(toDateInput(new Date(monthCursor.y, monthCursor.m - 1, day)))}
                    className={`month-day ${isToday ? "month-day-today" : ""}`}
                  >
                    <div className="month-day-number">{day}</div>
                    {hasEvents && (
                      <div className="event-badge">
                        <CalendarDays className="w-3 h-3" />
                        {monthEvents[String(day).padStart(2, "0")]}
                      </div>
                    )}
                  </button>
                );
              });
            })()}
          </div>
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="dialog-content" aria-describedby="dialog-agendamento">
          <DialogHeader className="dialog-header"><DialogTitle className="dialog-title">{form?.id ? "Editar Agendamento" : "Novo Agendamento"}</DialogTitle></DialogHeader>
          <div id="dialog-agendamento" className="sr-only">Formulario para criar ou editar agendamento</div>
          {form && (
            <div className="dialog-body">
              <div className="grid-2 mb-4">
                <div className="form-group">
                  <Label className="form-label">Cliente *</Label>
                  <Select value={form.cliente_id} onValueChange={(v) => setForm({ ...form, cliente_id: v })}>
                    <SelectTrigger data-testid="ag-cliente"><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                    <SelectContent>
                      {clientes.filter(c => c.id && c.id.trim()).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="form-group">
                  <Label className="form-label">Data e hora *</Label>
                  <Input type="datetime-local" value={form.data_hora} onChange={(e) => setForm({ ...form, data_hora: e.target.value })} className="form-input" />
                </div>
              </div>

              <div className="form-group mb-4">
                <Label className="form-label">Adicionar Serviço</Label>
                <Select onValueChange={(v) => { if (v) { addServico(v); } }}>
                  <SelectTrigger><SelectValue placeholder="Escolha um serviço para adicionar..." /></SelectTrigger>
                  <SelectContent>
                    {servicos.filter(s => s.id && s.id.trim()).map(s => <SelectItem key={s.id} value={s.id}>{s.nome} - {fmtBRL(s.valor)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="services-list mb-4">
                {form.itens_selecionados.map((item, index) => {
                  const s = servicos.find(x => x.id === item.servico_id);
                  return (
                    <div key={index} style={{ backgroundColor: "#F0F5F4", borderRadius: "0.5rem", padding: "0.75rem", marginBottom: "0.5rem", border: "1px solid #E0E7E6" }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold" style={{ color: "#3A4F4A" }}>{s?.nome}</span>
                        <Button size="sm" variant="ghost" onClick={() => removeServico(index)}><X className="w-4 h-4 text-rose-500" /></Button>
                      </div>
                      <div className="text-xs" style={{ color: "#a1a1aa", marginBottom: "0.5rem" }}>{s?.duracao_minutos}min • {fmtBRL(s?.valor)}</div>
                      <div className="grid-2">
                        <div className="form-group">
                          <Label className="form-label flex items-center gap-1"><User className="w-3 h-3" /> Profissional Principal</Label>
                          <Select value={item.colaborador_id || "none"} onValueChange={(v) => updateItemColab(index, v === "none" ? "" : v)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Selecione um profissional</SelectItem>
                              {colaboradores.filter(c => c.id && c.id.trim()).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="form-group">
                          <Label className="form-label flex items-center gap-1"><Users className="w-3 h-3" /> Auxiliar (Opcional)</Label>
                          <Select value={item.auxiliar_id || "none"} onValueChange={(v) => updateItemAux(index, v === "none" ? "" : v)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Nenhum</SelectItem>
                              {colaboradores.filter(c => c.id && c.id.trim()).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="form-group mb-4">
                <Label className="form-label">Observações</Label>
                <Textarea
                  rows={2}
                  value={form.observacoes}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                  className="form-input"
                  style={{ resize: "none" }}
                />
              </div>

              <div className="total-box">
                <div className="total-label">Total: {duracaoTotal}min</div>
                <div className="total-value">{fmtBRL(valorTotal)}</div>
              </div>
            </div>
          )}
          <DialogFooter><Button data-testid="save-ag-btn" onClick={save} className="btn-primary w-full">Salvar Agendamento</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openSenha} onOpenChange={(v) => { setOpenSenha(v); if (!v) setSenhaData({ agendamento_id: null, novo_status: null, email: "", senha: "" }); }}>
        <DialogContent className="dialog-content" aria-describedby="dialog-senha">
          <DialogHeader className="dialog-header"><DialogTitle className="dialog-title">Confirmar alteracao de status</DialogTitle></DialogHeader>
          <div id="dialog-senha" className="sr-only">Dialogo para confirmar alteracao de agendamento concluido</div>
          <div className="dialog-body">
            <p className="text-sm mb-4" style={{ color: "#52525b" }}>Este agendamento ja foi concluido. Para alterar seu status, digite suas credenciais:</p>
            <div className="form-group mb-4">
              <Label className="form-label">Email</Label>
              <Input type="email" placeholder="seu@email.com" value={senhaData.email} onChange={(e) => setSenhaData({ ...senhaData, email: e.target.value })} disabled={carregandoSenha} className="form-input" />
            </div>
            <div className="form-group">
              <Label className="form-label">Sua senha</Label>
              <Input type="password" placeholder="Digite sua senha" value={senhaData.senha} onChange={(e) => setSenhaData({ ...senhaData, senha: e.target.value })} onKeyPress={(e) => e.key === "Enter" && !carregandoSenha && confirmarMudancaStatus()} disabled={carregandoSenha} className="form-input" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpenSenha(false); setSenhaData({ agendamento_id: null, novo_status: null, email: "", senha: "" }); }} disabled={carregandoSenha}>Cancelar</Button>
            <Button onClick={confirmarMudancaStatus} className="btn-primary" disabled={carregandoSenha}>{carregandoSenha ? "Validando..." : "Confirmar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
