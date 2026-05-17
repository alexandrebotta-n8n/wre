"use client";
// Painel "Originação por sócio" — vive no topo de /simulacao.
// Valor anual por sócio; alimenta a Comissão de Originação do engine NOVO.
// Afeta todos os cenários DRAFT do ano.
import * as React from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Save, Coins, HelpCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { brl } from "@/lib/format";
import { salvarOriginacaoGlobalAction } from "@/app/simulacao/acoes-globais";

export interface SocioOriginacao {
  socioId: string;
  nome: string;
  cargo: string;
  valorAtual: number;
}

export interface PainelOriginacaoProps {
  ano: number;
  socios: SocioOriginacao[];
  cenariosDraftDoAno: number;
}

export function PainelOriginacao({ ano, socios, cenariosDraftDoAno }: PainelOriginacaoProps) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [pending, start] = useTransition();

  const inicial: Record<string, number> = React.useMemo(() => {
    const e: Record<string, number> = {};
    for (const s of socios) e[s.socioId] = s.valorAtual;
    return e;
  }, [socios]);
  const [estado, setEstado] = useState<Record<string, number>>(inicial);

  function temAlteracao(): boolean {
    for (const s of socios) {
      if (Math.abs((estado[s.socioId] ?? 0) - s.valorAtual) > 0.5) return true;
    }
    return false;
  }

  function salvar() {
    start(async () => {
      const sociosPayload = socios
        .filter((s) => Math.abs((estado[s.socioId] ?? 0) - s.valorAtual) > 0.5)
        .map((s) => ({ socioId: s.socioId, valor: estado[s.socioId] ?? 0 }));
      const fd = new FormData();
      fd.set("ano", String(ano));
      fd.set("payload", JSON.stringify({ socios: sociosPayload }));
      await salvarOriginacaoGlobalAction(fd);
      router.refresh();
    });
  }

  const totalAtual = socios.reduce((acc, s) => acc + s.valorAtual, 0);
  const totalNovo = socios.reduce((acc, s) => acc + (estado[s.socioId] ?? 0), 0);

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-amber-600" />
          <span className="font-semibold text-navy-900">Originação por sócio</span>
          <Badge variant="info" size="sm">ano {ano}</Badge>
          <span className="text-xs text-neutral-500 hidden sm:inline">
            · afeta todos os cenários NOVO
          </span>
          {temAlteracao() && (
            <Badge variant="warning" size="sm">● alterações não salvas</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 tabular-nums">
            Σ: <strong>{brl(totalAtual, true)}</strong>
          </span>
          {aberto ? (
            <ChevronDown className="h-4 w-4 text-neutral-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-neutral-500" />
          )}
        </div>
      </button>

      {aberto && (
        <div className="border-t border-neutral-100 p-4 space-y-3 bg-neutral-50/40">
          {cenariosDraftDoAno > 0 && (
            <div className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
              ⚠ Ao salvar, <strong>{cenariosDraftDoAno}</strong> cenário(s) DRAFT do ano serão marcados como dirty.
            </div>
          )}

          <div className="flex items-center gap-2 text-[11px] text-neutral-600 mb-1">
            <HelpCircle className="h-3 w-3" />
            Valor anual de receita originada por cada sócio. Multiplicado pela taxa de comissão da premissa NOVA para gerar a Comissão de Originação no pacote anual.
          </div>

          {socios.length === 0 ? (
            <p className="text-sm text-neutral-500 text-center py-6">
              Nenhum sócio ativo. Cadastre em{" "}
              <a href="/socios" className="text-peri-700 hover:underline">/socios</a>.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {socios.map((s) => (
                <div key={s.socioId} className="rounded-md border border-neutral-200 p-2.5 bg-white">
                  <div className="text-[12px] font-medium text-navy-900 truncate" title={s.nome}>
                    {s.nome}
                  </div>
                  <div className="text-[10px] text-neutral-500 truncate" title={s.cargo}>
                    {s.cargo}
                  </div>
                  <Input
                    type="number"
                    step={10000}
                    value={Math.round(estado[s.socioId] ?? 0)}
                    onChange={(e) =>
                      setEstado((c) => ({ ...c, [s.socioId]: Number(e.target.value) || 0 }))
                    }
                    className="text-right tabular-nums mt-1 h-8 text-xs"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-200">
            <span className="text-xs text-neutral-600">
              Σ novo:{" "}
              <strong className="tabular-nums text-navy-900">{brl(totalNovo, true)}</strong>
              {Math.abs(totalNovo - totalAtual) > 0.5 && (
                <span className={totalNovo > totalAtual ? "text-mint-700 ml-1" : "text-red-700 ml-1"}>
                  ({totalNovo > totalAtual ? "+" : ""}{brl(totalNovo - totalAtual, true)})
                </span>
              )}
            </span>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={salvar}
              disabled={pending || !temAlteracao()}
            >
              <Save className="h-3.5 w-3.5" />
              {pending ? "Salvando…" : "Salvar originação"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
