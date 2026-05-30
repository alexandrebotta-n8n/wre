"use client";
// Linha expansível da tabela comparativa — clique no nome abre o waterfall
// com a composição passo-a-passo do pacote do sócio (trace do engine).
// Visão ANUAL única (sem drill-down trimestral).
import { useState } from "react";
import { ArrowUp, ArrowDown, Minus, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TR, TD } from "@/components/ui/data-table";
import { brl, pct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SocioWaterfall } from "./socio-waterfall";
import type { LinhaComparativa } from "./types";

// Labels curtos das classificações DSF v1 — combinam bem na largura
// limitada da coluna na tabela.
const PUBLICOS_LABEL: Record<string, string> = {
  SOCIO_CAPITAL: "Sócio de Capital",
  SOCIO_CAPITAL_GESTOR: "Sócio de Capital — Gestor",
  SOCIO_CAPITAL_LIDER_UNIDADE: "Sócio de Capital — Líder Un.",
  SOCIO_SERVICOS: "Sócio de Serviços",
  SOCIO_SERVICOS_ESTRATEGICO: "Sócio de Serviços Estratégico",
  LIDER_UNIDADE_NON_EQUITY: "Líder de Un. Non-Equity",
  LIDER_TECNICO: "Líder Técnico (legado)",
  FUNDADOR: "Fundador",
};

// Badge de classificação reutilizado pelas células de público.
// `mudou` aplica um leve destaque (sinaliza que a classificação variou entre cenários).
function BadgePublico({ publico, mudou }: { publico: string | null; mudou?: boolean }) {
  if (!publico) return <span className="text-neutral-400">—</span>;
  const label = PUBLICOS_LABEL[publico] ?? publico;
  return (
    <Badge variant={mudou ? "warning" : "info"} size="sm" title={label}>
      {label}
    </Badge>
  );
}

export function LinhaSocio({
  linha: l,
  podeCompararDiff,
  singleLado,
  colSpan,
  nomeA,
  nomeB,
}: {
  linha: LinhaComparativa;
  podeCompararDiff: boolean;
  singleLado?: "a" | "b" | null;
  colSpan: number;
  nomeA?: string;
  nomeB?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const positivo = l.diff > 0;
  const zero = l.diff === 0;
  const Icon = zero ? Minus : positivo ? ArrowUp : ArrowDown;
  const corClasse = zero ? "text-neutral-500" : positivo ? "text-mint-700" : "text-red-700";

  const temAlgumTrace = l.traceA.length > 0 || l.traceB.length > 0;

  // Classificação mudou entre os cenários (ambos presentes e distintos).
  const publicoMudou =
    !singleLado && l.publicoA != null && l.publicoB != null && l.publicoA !== l.publicoB;

  return (
    <>
      <TR className={cn(aberto && "bg-peri-50/30")}>
        <TD className="px-4 py-2 font-medium text-navy-900">
          {temAlgumTrace ? (
            <button
              type="button"
              onClick={() => setAberto((v) => !v)}
              aria-expanded={aberto}
              className="inline-flex items-center gap-1.5 text-left rounded hover:text-peri-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peri-400"
              title="Ver composição do pacote (pró-labore, blocos, comissão, etc.)"
            >
              <ChevronRight
                className={cn(
                  "h-3.5 w-3.5 transition-transform text-neutral-400",
                  aberto && "rotate-90 text-peri-700",
                )}
                aria-hidden
              />
              {l.nome}
              {l.isFundador && <Badge variant="success" size="sm">fundador</Badge>}
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 pl-5">
              {l.nome}
              {l.isFundador && <Badge variant="success" size="sm">fundador</Badge>}
            </span>
          )}
        </TD>
        {singleLado ? (
          <TD>
            <BadgePublico publico={l.publico} />
          </TD>
        ) : (
          <>
            <TD>
              <BadgePublico publico={l.publicoA} />
            </TD>
            <TD>
              <BadgePublico publico={l.publicoB} mudou={publicoMudou} />
            </TD>
          </>
        )}
        {singleLado ? (
          <TD className="text-right tabular-nums">
            {(singleLado === "a" ? l.totalA : l.totalB) != null
              ? brl((singleLado === "a" ? l.totalA : l.totalB) as number, true)
              : "—"}
          </TD>
        ) : (
          <>
            <TD className="text-right tabular-nums">{l.totalA != null ? brl(l.totalA, true) : "—"}</TD>
            <TD className="text-right tabular-nums">{l.totalB != null ? brl(l.totalB, true) : "—"}</TD>
          </>
        )}
        {podeCompararDiff && (
          <TD className={cn("text-right tabular-nums font-medium", corClasse)}>
            <span className="inline-flex items-center gap-1 justify-end">
              <Icon className="h-3 w-3" aria-hidden />
              {positivo ? "+" : ""}
              {brl(l.diff, true)}
            </span>
          </TD>
        )}
        {podeCompararDiff && (
          <TD className={cn("text-right tabular-nums text-xs", corClasse)}>
            {l.diffPct === null ? "—" : (positivo ? "+" : "") + pct(l.diffPct)}
          </TD>
        )}
      </TR>
      {aberto && temAlgumTrace && (
        <tr>
          <td colSpan={colSpan} className="p-0">
            <SocioWaterfall
              nome={l.nome}
              nomeA={nomeA}
              nomeB={nomeB}
              totalA={l.totalA}
              totalB={l.totalB}
              traceA={l.traceA}
              traceB={l.traceB}
              alertasA={l.alertasA}
              alertasB={l.alertasB}
            />
          </td>
        </tr>
      )}
    </>
  );
}
