import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import http from "../api";
import { Button } from "../components/ui/button";
import { ArrowLeft } from "lucide-react";
import StatusBadge from "../components/StatusBadge";

const fmtBRL = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (s) => new Date(s).toLocaleString("pt-BR");

export default function ClienteHistorico() {
  const { id } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  useEffect(() => { http.get(`/clientes/${id}/historico`).then((r) => setData(r.data)); }, [id]);
  if (!data) return <div className="p-8 text-zinc-400">Carregando...</div>;
  const { cliente, agendamentos, total_gasto, total_visitas } = data;

  return (
    <div className="p-6 lg:p-8 fade-in">
      <Button variant="ghost" onClick={() => nav(-1)} className="mb-4"><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Button>
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="text-xs uppercase tracking-wider text-zinc-400">Cliente</div>
          <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">{cliente.nome}</h1>
          <div className="text-sm text-zinc-500 mt-1">{cliente.telefone || ""} {cliente.email && `· ${cliente.email}`}</div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-zinc-200 rounded-xl p-5 min-w-[160px]">
            <div className="text-xs uppercase tracking-wider text-zinc-400">Visitas</div>
            <div className="font-display text-3xl font-semibold mt-1">{total_visitas}</div>
          </div>
          <div className="bg-white border border-zinc-200 rounded-xl p-5 min-w-[160px]">
            <div className="text-xs uppercase tracking-wider text-zinc-400">Total gasto</div>
            <div className="font-display text-3xl font-semibold mt-1 text-[#3A4F4A]">{fmtBRL(total_gasto)}</div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100"><h3 className="font-display text-lg font-medium">Atendimentos</h3></div>
        {agendamentos.length === 0 ? <div className="p-8 text-center text-zinc-400 text-sm">Sem atendimentos</div> : (
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
              <tr><th className="px-4 py-3 text-left">Data</th><th className="px-4 py-3 text-left">Serviços</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-right">Valor</th></tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {agendamentos.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3 text-zinc-700">{fmtDate(a.data_hora)}</td>
                  <td className="px-4 py-3">{a.itens?.map((i) => i.nome).join(", ")}</td>
                  <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                  <td className="px-4 py-3 text-right font-medium">{fmtBRL(a.valor_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
