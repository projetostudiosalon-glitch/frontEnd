import React, { useEffect, useState } from "react";
import http from "../api";
import { PageHeader } from "../components/Page";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card } from "../components/ui/card";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const FORMAS = [
  { v: "cartao_credito", l: "Cartão Crédito" },
  { v: "cartao_debito", l: "Cartão Débito" }
];

export default function ConfiguracoesTaxas() {
  const [taxas, setTaxas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const r = await http.get("/configuracoes/taxas-cartao");
      setTaxas(r.data);
    } catch (e) {
      toast.error("Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const updateTaxa = (forma, percentual) => {
    setTaxas(taxas.map(t => 
      t.forma_pagamento === forma 
        ? { ...t, percentual: parseFloat(percentual) || 0 }
        : t
    ));
  };

  const saveTaxas = async () => {
    setSaving(true);
    try {
      for (const taxa of taxas) {
        await http.post("/configuracoes/taxas-cartao", {
          forma_pagamento: taxa.forma_pagamento,
          percentual: taxa.percentual,
          ativo: taxa.ativo
        });
      }
      toast.success("Taxas de cartão atualizadas com sucesso!");
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-zinc-400">Carregando...</div>;

  return (
    <div className="p-6 lg:p-8 fade-in">
      <PageHeader overline="Configurações" title="Taxas de Cartão" />

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700">
          <strong>Importante:</strong> As taxas configuradas aqui serão descontadas automaticamente no DRE como despesa operacional. Elas serão calculadas sobre o valor total recebido em cartão.
        </div>
      </div>

      <div className="grid gap-4 mb-6">
        {taxas.map((taxa) => (
          <Card key={taxa.forma_pagamento} className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label className="text-base font-semibold">
                  {FORMAS.find(f => f.v === taxa.forma_pagamento)?.l}
                </Label>
                <p className="text-sm text-zinc-600 mt-1">
                  Taxa percentual cobrada pela operadora
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={taxa.percentual}
                  onChange={(e) => updateTaxa(taxa.forma_pagamento, e.target.value)}
                  className="w-24 text-right"
                  placeholder="0,00"
                />
                <span className="text-lg font-semibold text-zinc-700">%</span>
              </div>
            </div>
            <div className="mt-3 text-xs text-zinc-500">
              {taxa.percentual > 0 ? (
                <span className="text-amber-600">
                  ⚠️ Taxa de {taxa.percentual.toFixed(2)}% será descontada no DRE
                </span>
              ) : (
                <span className="text-emerald-600">
                  ✓ Sem taxa configurada
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl p-6">
        <h3 className="font-display text-lg font-medium mb-4">Exemplo de Cálculo</h3>
        <div className="space-y-2 text-sm text-zinc-600">
          <p>Se você receber <strong>R$ 1.000,00</strong> em cartão de crédito com taxa de <strong>2.5%</strong>:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Valor recebido: R$ 1.000,00</li>
            <li>Taxa (2.5%): R$ 25,00</li>
            <li>Valor líquido: R$ 975,00</li>
            <li>No DRE: A taxa de R$ 25,00 aparecerá como despesa</li>
          </ul>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <Button variant="outline" onClick={load}>Cancelar</Button>
        <Button 
          onClick={saveTaxas} 
          disabled={saving}
          className="bg-[#84A59D] hover:bg-[#6F9189]"
        >
          {saving ? "Salvando..." : "Salvar configurações"}
        </Button>
      </div>
    </div>
  );
}
