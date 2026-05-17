"use client";
// Painel "Variáveis globais" — vive no topo de /simulacao. Edição inline
// do único insumo global anual que afeta TODOS os cenários do ano:
//   - Lucro Líquido da DSF (matriz consolidada)
//   - Lucro Líquido de cada unidade não-matriz
//
// Funding (variável das unidades, fundadores) foi REMOVIDO desta tela.
// Funding fundador agora é campo individual em /socios (per fundador).
//
// Layout: card único com grid limpo, máscara de moeda BRL nos inputs.
// Ao salvar, marca todos os DRAFTs do ano como dirty.
import * as React from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Save, Globe2, Building2, Building } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/ui/money-input";
import { brl } from "@/lib/format";
import { salvarGlobaisAction } from "@/app/simulacao/acoes-globais";

export interface UnidadeGlobal {
  unidadeId: string;
  codigo: string;
  nome: string;
  isMatriz: boolean;
  llAtual: number;
}

export interface PainelGlobaisProps {
  ano: number;
  unidades: UnidadeGlobal[];
  cenariosDraftDoAno: number;
}

export function PainelGlobais({ ano, unidades, cenariosDraftDoAno }: PainelGlobaisProps) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [pending, start] = useTransition();

  const inicial: Record<string, number> = React.useMemo(() => {
    const e: Record<string, number> = {};
    for (const u of unidades) e[u.unidadeId] = u.llAtual;
    return e;
  }, [unidades]);
  const [llPorUnidade, setLLPorUnidade] = useState<Record<string, number>>(inicial);

  const temAlteracao = (): boolean => {
    for (const u of unidades) {
      if (Math.abs((llPorUnidade[u.unidadeId] ?? 0) - u.llAtual) > 0.5) return true;
    }
    return false;
  };

  function salvar() {
    start(async () => {
      const payload = {
        unidades: unidades.map((u) => ({
          unidadeId: u.unidadeId,
          lucroLiquido: llPorUnidade[u.unidadeId] ?? 0,
        })),
      };
      const fd = new FormData();
      fd.set("ano", String(ano));
      fd.set("payload", JSON.stringify(payload));
      await salvarGlobaisAction(fd);
      router.refresh();
    });
  }

  const matriz = unidades.find((u) => u.isMatriz);
  const naoMatriz = unidades.filter((u) => !u.isMatriz);

  return (
    <Card className="overflow-hidden border-peri-200">
      {/* Header colapsável */}
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-peri-50/40 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Globe2 className="h-4 w-4 text-peri-700" />
          <span className="font-semibold text-navy-900">Variáveis globais — ano {ano}</span>
          <span className="text-xs text-neutral-500 hidden sm:inline">
            afetam todos os cenários
          </span>
          {temAlteracao() && (
            <Badge variant="warning" size="sm">● alterações não salvas</Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-600 tabular-nums hidden sm:inline">
            LL DSF: <strong className="text-navy-900">{brl(matriz?.llAtual ?? 0, true)}</strong>
          </span>
          {aberto ? (
            <ChevronDown className="h-4 w-4 text-neutral-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-neutral-500" />
          )}
        </div>
      </button>

      {aberto && (
        <div className="border-t border-peri-100 p-4 space-y-4 bg-peri-50/20">
          {cenariosDraftDoAno > 0 && (
            <div className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5 flex items-start gap-2">
              <span>⚠</span>
              <span>
                Ao salvar, <strong>{cenariosDraftDoAno}</strong> cenário(s) DRAFT do ano serão
                marcados como dirty. Recalcule cada um para refletir.
              </span>
            </div>
          )}

          {/* Grid: DSF Global em destaque + unidades */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {matriz && (
              <LinhaUnidade
                u={matriz}
                valor={llPorUnidade[matriz.unidadeId] ?? matriz.llAtual}
                onChange={(v) => setLLPorUnidade((c) => ({ ...c, [matriz.unidadeId]: v ?? 0 }))}
                destaque
              />
            )}
            {naoMatriz.map((u) => (
              <LinhaUnidade
                key={u.unidadeId}
                u={u}
                valor={llPorUnidade[u.unidadeId] ?? u.llAtual}
                onChange={(v) => setLLPorUnidade((c) => ({ ...c, [u.unidadeId]: v ?? 0 }))}
              />
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-peri-200">
            {!temAlteracao() && (
              <span className="text-xs text-neutral-500">sem alterações</span>
            )}
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={salvar}
              disabled={pending || !temAlteracao()}
            >
              <Save className="h-3.5 w-3.5" />
              {pending ? "Salvando…" : "Salvar variáveis globais"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function LinhaUnidade({
  u,
  valor,
  onChange,
  destaque = false,
}: {
  u: UnidadeGlobal;
  valor: number;
  onChange: (v: number | null) => void;
  destaque?: boolean;
}) {
  const Icon = destaque ? Building2 : Building;
  return (
    <div
      className={
        "rounded-lg border p-3 bg-white " +
        (destaque ? "border-peri-300 ring-1 ring-peri-100" : "border-neutral-200")
      }
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className={"h-4 w-4 " + (destaque ? "text-peri-700" : "text-neutral-500")} />
        <span className="font-semibold text-navy-900 text-sm">{u.nome}</span>
        {destaque ? (
          <Badge variant="navy" size="sm">matriz consolidada</Badge>
        ) : (
          <span className="text-[10px] text-neutral-500">cód. {u.codigo}</span>
        )}
      </div>
      <label className="text-[11px] font-medium text-navy-900 block mb-1">
        Lucro Líquido anual
      </label>
      <MoneyInput
        value={valor}
        onChange={onChange}
        aria-label={`Lucro líquido anual de ${u.nome}`}
      />
      <div className="text-[10px] text-neutral-500 mt-1">
        Salvo: <span className="tabular-nums">{brl(u.llAtual, true)}</span>
      </div>
    </div>
  );
}
