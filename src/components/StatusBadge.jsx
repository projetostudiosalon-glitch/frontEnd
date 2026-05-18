import React from "react";

export const STATUS_LABELS = {
  agendado: "Agendado",
  confirmado: "Confirmado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const COLORS = {
  agendado: "bg-sky-100 text-sky-700",
  confirmado: "bg-amber-100 text-amber-700",
  em_andamento: "bg-purple-100 text-purple-700",
  concluido: "bg-emerald-100 text-emerald-700",
  cancelado: "bg-rose-100 text-rose-700",
};

export default function StatusBadge({ status }) {
  const cls = COLORS[status] || "bg-zinc-100 text-zinc-700";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`} data-testid={`status-${status}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}
