import React, { useEffect, useState } from "react";
import http from "../api";

// Status -> cor (vertical stripe + bg suave)
const STATUS_COLORS = {
  agendado: { stripe: "#0EA5E9", bg: "#E0F2FE", text: "#0369A1" },
  confirmado: { stripe: "#F59E0B", bg: "#FEF3C7", text: "#92400E" },
  em_andamento: { stripe: "#A855F7", bg: "#F3E8FF", text: "#6B21A8" },
  concluido: { stripe: "#10B981", bg: "#D1FAE5", text: "#065F46" },
  cancelado: { stripe: "#F43F5E", bg: "#FEE2E2", text: "#9F1239" },
};

const HOUR_START = 8;
const HOUR_END = 21;
const ROW_HEIGHT = 56;
const HOUR_WIDTH = 100;

export default function AgendaTimeline({ data }) {
  const [colaboradores, setColaboradores] = useState([]);
  const [agendamentos, setAgendamentos] = useState([]);

  useEffect(() => {
    http.get("/colaboradores").then((r) => setColaboradores(r.data.filter((c) => c.ativo)));
  }, []);
  useEffect(() => {
    http.get("/agendamentos", { params: { data } }).then((r) => setAgendamentos(r.data));
  }, [data]);

  const hours = [];
  for (let h = HOUR_START; h < HOUR_END; h++) hours.push(h);
  const totalWidth = hours.length * HOUR_WIDTH;

  // Agrupar agendamentos por colaborador principal
  const byColab = {};
  colaboradores.forEach((c) => { byColab[c.id] = []; });
  agendamentos.forEach((a) => {
    const principais = a.profissionais?.filter((p) => p.tipo === "principal") || [];
    principais.forEach((p) => {
      if (byColab[p.id]) byColab[p.id].push(a);
    });
  });

  const agendamentosSemProf = agendamentos.filter((a) => !a.profissionais?.length);

  const calcBlock = (a) => {
    const d = new Date(a.data_hora);
    const startH = d.getHours() + d.getMinutes() / 60;
    const dur = (a.duracao_minutos || 60) / 60;
    const left = (startH - HOUR_START) * HOUR_WIDTH;
    const width = Math.max(dur * HOUR_WIDTH, 80);
    return { left, width };
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto scrollbar-thin">
        <div className="relative" style={{ minWidth: `${220 + totalWidth}px` }}>
          {/* Header: horários */}
          <div className="flex sticky top-0 bg-zinc-50 border-b border-zinc-200 z-10">
            <div className="w-[220px] flex-shrink-0 px-4 py-3 text-xs uppercase tracking-wider text-zinc-500 font-medium border-r border-zinc-200">
              Profissional
            </div>
            <div className="flex" style={{ width: `${totalWidth}px` }}>
              {hours.map((h) => (
                <div key={h} className="border-r border-zinc-100 text-xs text-zinc-500 font-medium px-2 py-3" style={{ width: `${HOUR_WIDTH}px` }}>
                  {String(h).padStart(2, "0")}:00
                </div>
              ))}
            </div>
          </div>

          {/* Linhas: colaboradores */}
          {colaboradores.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-zinc-400">Nenhum colaborador ativo cadastrado.</div>
          ) : colaboradores.map((c) => (
            <div key={c.id} className="flex border-b border-zinc-100 relative" style={{ height: `${ROW_HEIGHT}px` }} data-testid={`timeline-row-${c.id}`}>
              <div className="w-[220px] flex-shrink-0 px-4 py-3 border-r border-zinc-200 flex items-center">
                <div>
                  <div className="font-medium text-sm">{c.nome}</div>
                  <div className="text-xs text-zinc-400">{c.cargo || "—"}</div>
                </div>
              </div>
              <div className="relative" style={{ width: `${totalWidth}px` }}>
                {/* Linhas verticais por hora */}
                {hours.map((h) => (
                  <div key={h} className="absolute top-0 bottom-0 border-r border-zinc-100" style={{ left: `${(h - HOUR_START) * HOUR_WIDTH}px`, width: `${HOUR_WIDTH}px` }} />
                ))}
                {/* Blocos de agendamento */}
                {byColab[c.id]?.map((a) => {
                  const { left, width } = calcBlock(a);
                  const colors = STATUS_COLORS[a.status] || STATUS_COLORS.agendado;
                  const time = new Date(a.data_hora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                  return (
                    <div
                      key={a.id}
                      data-testid={`timeline-block-${a.id}`}
                      className="absolute top-1 bottom-1 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      style={{ left: `${left}px`, width: `${width}px`, background: colors.bg, borderLeft: `3px solid ${colors.stripe}` }}
                      title={`${time} · ${a.cliente_nome} · ${a.itens?.map((i) => i.nome).join(", ")}`}
                    >
                      <div className="px-2 py-1 h-full flex flex-col justify-center" style={{ color: colors.text }}>
                        <div className="text-xs font-semibold leading-tight truncate">{time} · {a.cliente_nome}</div>
                        <div className="text-[11px] opacity-80 leading-tight truncate">{a.itens?.map((i) => i.nome).join(", ")}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Agendamentos sem profissional */}
          {agendamentosSemProf.length > 0 && (
            <div className="flex border-b border-zinc-100 relative bg-zinc-50/50" style={{ height: `${ROW_HEIGHT}px` }}>
              <div className="w-[220px] flex-shrink-0 px-4 py-3 border-r border-zinc-200 flex items-center">
                <div className="text-xs text-zinc-400 italic">Sem profissional definido</div>
              </div>
              <div className="relative" style={{ width: `${totalWidth}px` }}>
                {agendamentosSemProf.map((a) => {
                  const { left, width } = calcBlock(a);
                  const colors = STATUS_COLORS[a.status] || STATUS_COLORS.agendado;
                  const time = new Date(a.data_hora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                  return (
                    <div key={a.id} className="absolute top-1 bottom-1 rounded-lg overflow-hidden shadow-sm" style={{ left: `${left}px`, width: `${width}px`, background: colors.bg, borderLeft: `3px solid ${colors.stripe}` }}>
                      <div className="px-2 py-1 text-xs" style={{ color: colors.text }}>{time} · {a.cliente_nome}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-3 px-4 py-3 border-t border-zinc-100 bg-zinc-50/40">
        {Object.entries(STATUS_COLORS).map(([k, c]) => (
          <div key={k} className="flex items-center gap-1.5 text-xs text-zinc-600">
            <span className="w-3 h-3 rounded" style={{ background: c.bg, borderLeft: `3px solid ${c.stripe}` }} />
            <span className="capitalize">{k.replace("_", " ")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
