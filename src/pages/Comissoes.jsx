import React, { useEffect, useState } from "react";
import http from "../api";
import { PageHeader } from "../components/Page";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Wallet, ChevronLeft, ChevronRight, CheckCircle2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

const fmtBRL = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (s) => s ? new Date(s).toLocaleDateString("pt-BR") : "—";

export default function Comissoes() {
  const today = new Date();
  const [mes, setMes] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`);
  const [data, setData] = useState(null);

  const load = () => http.get("/comissoes", { params: { mes } }).then((r) => setData(r.data));
  useEffect(() => { load(); }, [mes]);

  const togglePago = async (c) => {
    try {
      if (c.pago) {
        await http.delete(`/comissoes/pagar`, { params: { colaborador_id: c.colaborador_id, mes } });
        toast.success("Pagamento desfeito");
      } else {
        await http.post("/comissoes/pagar", { colaborador_id: c.colaborador_id, mes, valor: c.valor_comissao });
        toast.success("Comissão marcada como paga");
      }
      load();
    } catch { toast.error("Erro"); }
  };

  const changeMonth = (delta) => {
    const [y, m] = mes.split("-").map(Number);
    const d = new Date(y, m - 1 + delta);
    setMes(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const monthName = new Date(mes + "-01").toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="p-6 lg:p-8 fade-in">
      <PageHeader overline="Equipe" title="Comissões" action={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => changeMonth(-1)}><ChevronLeft className="w-4 h-4" /></Button>
          <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="w-40" data-testid="comissoes-mes" />
          <Button variant="outline" size="icon" onClick={() => changeMonth(1)}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      } />

      {data && (
        <>
          <div className="bg-white border border-zinc-200 rounded-xl p-5 mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-zinc-400">Total a pagar · {monthName}</div>
              <div className="font-display text-4xl font-semibold mt-1 text-[#3A4F4A]">{fmtBRL(data.total)}</div>
            </div>
            <Wallet className="w-10 h-10 text-zinc-200" />
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
                <tr><th className="px-4 py-3 text-left">Profissional</th><th className="px-4 py-3 text-right">Atendimentos</th><th className="px-4 py-3 text-right">Como principal</th><th className="px-4 py-3 text-right">Como auxiliar</th><th className="px-4 py-3 text-right">Comissão</th><th className="px-4 py-3">Status</th><th></th></tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {data.comissoes.length === 0 ? (
                  <tr><td colSpan="7" className="px-4 py-8 text-center text-zinc-400">Sem dados no mês</td></tr>
                ) : data.comissoes.map((c) => (
                  <tr key={c.colaborador_id} className="hover:bg-zinc-50/60" data-testid={`comissao-${c.colaborador_id}`}>
                    <td className="px-4 py-3 font-medium">{c.colaborador_nome}<div className="text-xs text-zinc-400 font-normal">{c.comissao_principal}% / {c.comissao_auxiliar}% aux</div></td>
                    <td className="px-4 py-3 text-right">{c.atendimentos}</td>
                    <td className="px-4 py-3 text-right text-zinc-600">{fmtBRL(c.total_principal)}</td>
                    <td className="px-4 py-3 text-right text-zinc-600">{fmtBRL(c.total_auxiliar)}</td>
                    <td className="px-4 py-3 text-right font-display font-semibold text-[#3A4F4A]">{fmtBRL(c.valor_comissao)}</td>
                    <td className="px-4 py-3">
                      {c.pago ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium"><CheckCircle2 className="w-3 h-3" /> Pago {fmtDate(c.data_pagamento)}</span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">Pendente</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.valor_comissao > 0 && (
                        <Button size="sm" variant={c.pago ? "outline" : "default"} onClick={() => togglePago(c)} className={c.pago ? "" : "bg-[#84A59D] hover:bg-[#6F9189]"} data-testid={`toggle-pago-${c.colaborador_id}`}>
                          {c.pago ? <><RotateCcw className="w-3 h-3 mr-1" /> Desfazer</> : <><CheckCircle2 className="w-3 h-3 mr-1" /> Marcar pago</>}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
