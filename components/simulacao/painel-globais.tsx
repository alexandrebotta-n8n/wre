"use client";
// Painel "Variáveis globais" — vive no topo de /simulacao. Edição inline
// dos insumos que afetam TODOS os cenários do ano:
//   - LL DSF Global (matriz) + LL de cada unidade não-matriz
//
// A remuneração dos fundadores é definida CASO A CASO em
// ClassificacaoSocio.valorDiscricionario (drawer de classificações por cenário).
//
// Ao salvar, o servidor marca todos os DRAFTs do ano como dirty.
import * as React from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Save, HelpCircle, Globe2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/tooltip";
import { brl } from "@/lib/format";
import { salvarGlobaisAction } from "@/app/simulacao/acoes-globais";

export interface UnidadeGlobal {
  unidadeId: string;
  codigo: string;
  nome: string;
  isMatriz: boolean;
  llAtual: number;
  fundingAtual: number | null;
}

export interface PainelGlobaisProps {
  ano: number;
  unidades: UnidadeGlobal[];
  cenariosDraftDoAno: number;
}

export function PainelGlobais({
  ano,
  unidades,
  cenariosDraftDoAno,
}: PainelGlobaisProps) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [pending, start] = useTransition();

  type Estado = Record<string, { ll: number; fv: number | null }>;
  const inicial: Estado = React.useMemo(() => {
    const e: Estado = {};
    for (const u of unidades) e[u.unidadeId] = { ll: u.llAtual, fv: u.fundingAtual };
    return e;
  }, [unidades]);
  const [estado, setEstado] = useState<Estado>(inicial);

  function temAlteracao(): boolean {
    for (const u of unidades) {
      const e = estado[u.unidadeId];
      if (!e) continue;
      if (Math.abs(e.ll - u.llAtual) > 0.5) return true;
      if ((e.fv ?? 0) !== (u.fundingAtual ?? 0)) return true;
    }
    return false;
  }

  function salvar() {
    start(async () => {
      const payload = {
        unidades: unidades.map((u) => ({
          unidadeId: u.unidadeId,
          lucroLiquido: estado[u.unidadeId]?.ll ?? 0,
          fundingVariavel: estado[u.unidadeId]?.fv ?? null,
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
    <Card className="overflow-hidden">
      {/* Header colapsável */}
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Globe2 className="h-4 w-4 text-peri-600" />
          <span className="font-semibold text-navy-900">Variáveis globais</span>
          <Badge variant="info" size="sm">ano {ano}</Badge>
          <span className="text-xs text-neutral-500 hidden sm:inline">
            · afetam todos os cenários
          </span>
          {temAlteracao() && (
            <Badge variant="warning" size="sm">● alterações não salvas</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 tabular-nums">
            LL matriz: <strong>{brl(matriz?.llAtual ?? 0, true)}</strong>
          </span>
          {aberto ? (
            <ChevronDown className="h-4 w-4 text-neutral-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-neutral-500" />
          )}
        </div>
      </button>

      {aberto && (
        <div className="border-t border-neutral-100 p-4 space-y-4 bg-neutral-50/40">
          {/* Avisos */}
          {cenariosDraftDoAno > 0 && (
            <div className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
              ⚠ Ao salvar, <strong>{cenariosDraftDoAno}</strong> cenário(s) DRAFT do ano serão marcados como dirty. Recalcule cada um para refletir.
            </div>
          )}

          {/* LL DSF Global */}
          {matriz && (
            <div className="rounded-lg border border-neutral-200 p-3 bg-white">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold text-navy-900 text-sm">{matriz.nome}</span>
                <Badge variant="navy" size="sm">matriz consolidada</Badge>
                <Tooltip content="LL da DSF consolidada — base para o RDA central no engine NOVO e para o funding residual no engine ATUAL.">
                  <HelpCircle className="h-3 w-3 text-neutral-400" />
                </Tooltip>
              </div>
              <UnidadeLinha
                u={matriz}
                estado={estado[matriz.unidadeId] ?? { ll: matriz.llAtual, fv: matriz.fundingAtual }}
                onChange={(e) => setEstado((c) => ({ ...c, [matriz.unidadeId]: e }))}
              />
            </div>
          )}

          {/* LL Unidades */}
          {naoMatriz.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold mb-1.5">
                Unidades (não-matriz)
              </div>
              <div className="space-y-2">
                {naoMatriz.map((u) => (
                  <div key={u.unidadeId} className="rounded-lg border border-neutral-200 p-3 bg-white">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-navy-900 text-sm">{u.nome}</span>
                      <span className="text-[10px] text-neutral-500">cód. {u.codigo}</span>
                    </div>
                    <UnidadeLinha
                      u={u}
                      estado={estado[u.unidadeId] ?? { ll: u.llAtual, fv: u.fundingAtual }}
                      onChange={(e) => setEstado((c) => ({ ...c, [u.unidadeId]: e }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Remuneração dos fundadores — agora editada caso a caso */}
          <div className="rounded-lg border border-amber-200 p-3 bg-amber-50/30 text-xs text-amber-900">
            <strong>Remuneração de fundadores:</strong> agora é definida CASO A CASO em cada cenário,
            no drawer <em>Classificações</em> (coluna &quot;Discricionário&quot;).
          </div>

          {/* Footer ações */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200">
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

function UnidadeLinha({
  u,
  estado,
  onChange,
}: {
  u: UnidadeGlobal;
  estado: { ll: number; fv: number | null };
  onChange: (e: { ll: number; fv: number | null }) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className="text-[11px] font-medium text-navy-900">Lucro Líquido anual (R$)</label>
        <Input
          type="number"
          step={10000}
          value={Math.round(estado.ll)}
          onChange={(e) => onChange({ ...estado, ll: Number(e.target.value) || 0 })}
          className="text-right tabular-nums"
        />
        <div className="text-[10px] text-neutral-500 mt-1">
          Salvo: <span className="tabular-nums">{brl(u.llAtual, true)}</span>
        </div>
      </div>
      <div>
        <label className="text-[11px] font-medium text-navy-900 inline-flex items-center gap-1">
          Funding Variável (R$){" "}
          <Tooltip content="Opcional. Se preenchido, é usado pelo engine como funding disponível. Se vazio, o engine calcula como LL menos deduções.">
            <HelpCircle className="h-3 w-3 text-neutral-400" />
          </Tooltip>
        </label>
        <Input
          type="number"
          step={10000}
          value={estado.fv == null ? "" : Math.round(estado.fv)}
          onChange={(e) =>
            onChange({ ...estado, fv: e.target.value === "" ? null : Number(e.target.value) || 0 })
          }
          placeholder="(opcional — auto)"
          className="text-right tabular-nums"
        />
        {u.fundingAtual != null && (
          <div className="text-[10px] text-neutral-500 mt-1">
            Salvo: <span className="tabular-nums">{brl(u.fundingAtual, true)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
