"use client";
// Painel "Variáveis globais" — vive no topo de /simulacao, SEMPRE expandido
// (sem colapsar) num layout horizontal compacto. Edição inline de LL DSF +
// LL por unidade. Estado de salvamento vive no próprio botão (Salvo ✓ /
// ● Salvar variáveis globais).
//
// Ao salvar, marca todos os DRAFTs do ano como dirty (warning inline aparece
// só quando há alteração pendente).
import * as React from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Save, Globe2, Check, Users, Settings } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/ui/money-input";
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
  /** IDs dos cenários A/B visíveis — recalculados automaticamente após save. */
  aId?: string;
  bId?: string;
}

export function PainelGlobais({
  ano,
  unidades,
  cenariosDraftDoAno,
  aId,
  bId,
}: PainelGlobaisProps) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const inicial: Record<string, number> = React.useMemo(() => {
    const e: Record<string, number> = {};
    for (const u of unidades) e[u.unidadeId] = u.llAtual;
    return e;
  }, [unidades]);
  const [llPorUnidade, setLLPorUnidade] = useState<Record<string, number>>(inicial);

  // Re-sync interno quando a prop muda (após salvar e refresh).
  const [prevInicial, setPrevInicial] = useState(inicial);
  if (prevInicial !== inicial) {
    setPrevInicial(inicial);
    setLLPorUnidade(inicial);
  }

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
        aId,
        bId,
      };
      const fd = new FormData();
      fd.set("ano", String(ano));
      fd.set("payload", JSON.stringify(payload));
      await salvarGlobaisAction(fd);
      router.refresh();
    });
  }

  const dirty = temAlteracao();

  return (
    <Card className="border-peri-200 px-4 py-2.5">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="inline-flex items-center gap-2 shrink-0">
          <Globe2 className="h-4 w-4 text-peri-700" />
          <span className="font-semibold text-navy-900 text-sm">Globais {ano}</span>
        </div>

        {unidades.map((u) => (
          <UnidadeInline
            key={u.unidadeId}
            unidade={u}
            valor={llPorUnidade[u.unidadeId] ?? u.llAtual}
            onChange={(v) => setLLPorUnidade((c) => ({ ...c, [u.unidadeId]: v ?? 0 }))}
          />
        ))}

        <div className="ml-auto inline-flex items-center gap-2">
          {/* Atalhos pras telas de cadastro permanente — vivem aqui pra ficar
              próximo ao contexto de uso (em vez de poluírem a nav top). */}
          <div className="inline-flex items-center gap-0.5 pr-2 mr-1 border-r border-neutral-200">
            <Link
              href="/socios"
              className="inline-flex items-center gap-1.5 text-xs text-neutral-700 hover:text-peri-700 hover:bg-peri-50 rounded px-2 py-1 transition-colors"
              title="Cadastro permanente de sócios (originação, funding fundador, overrides)"
            >
              <Users className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sócios</span>
            </Link>
            <Link
              href="/premissas"
              className="inline-flex items-center gap-1.5 text-xs text-neutral-700 hover:text-peri-700 hover:bg-peri-50 rounded px-2 py-1 transition-colors"
              title="Premissas — templates de parâmetros por modelo (ATUAL/NOVO)"
            >
              <Settings className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Premissas</span>
            </Link>
          </div>
          {dirty && cenariosDraftDoAno > 0 && (
            <span className="text-[11px] text-amber-700 hidden md:inline">
              ⚠ {cenariosDraftDoAno} DRAFT(s) ficarão dirty
            </span>
          )}
          <Button
            type="button"
            variant={dirty ? "primary" : "ghost"}
            size="sm"
            onClick={salvar}
            disabled={pending || !dirty}
            aria-busy={pending}
          >
            {pending ? (
              <>
                <Save className="h-3.5 w-3.5" /> Salvando…
              </>
            ) : dirty ? (
              <>
                <Save className="h-3.5 w-3.5" /> Salvar variáveis globais
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5 text-mint-600" /> Salvo
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function UnidadeInline({
  unidade,
  valor,
  onChange,
}: {
  unidade: UnidadeGlobal;
  valor: number;
  onChange: (v: number | null) => void;
}) {
  const label = unidade.isMatriz ? `${unidade.codigo} (matriz)` : unidade.codigo;
  return (
    <div className="inline-flex items-center gap-1.5 shrink-0">
      <span
        className={
          "text-[11px] font-medium whitespace-nowrap " +
          (unidade.isMatriz ? "text-peri-700" : "text-neutral-600")
        }
        title={unidade.nome}
      >
        {label}:
      </span>
      <div
        className={
          unidade.isMatriz
            ? "ring-1 ring-peri-200 rounded"
            : ""
        }
      >
        <MoneyInput
          value={valor}
          onChange={onChange}
          aria-label={`Lucro líquido anual de ${unidade.nome}`}
          className="w-40 h-8 text-sm"
        />
      </div>
    </div>
  );
}
