"use client";
// Linha expansível com o trace de cálculo de um sócio.
// Usa Radix Collapsible (a11y completa, sem manipulação direta de DOM).
import { useState } from "react";
import { ChevronRight, AlertCircle } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface TraceItem {
  etapa: string;
  descricao: string;
  valor?: number;
}

interface TraceRowProps {
  nome: string;
  trace: TraceItem[];
  alertas: string[];
  /** Conteúdo da linha "fechada" (colunas com valores). */
  rowContent: React.ReactNode;
  /** Quantidade de colunas para o colSpan da linha expandida. */
  colSpan: number;
  /** ID estável para conteúdo expandido (acessibilidade). */
  id: string;
}

const fmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2,
});

/**
 * Linha de tabela com toggle integrado para expandir o trace.
 * Renderiza 2 <tr>s: a do conteúdo principal e a do trace (colSpan).
 */
export function TraceRow({ nome, trace, alertas, rowContent, colSpan, id }: TraceRowProps) {
  const [aberto, setAberto] = useState(false);
  const temErro = alertas.some((a) => a.includes("[ERROR]"));
  const temWarn = alertas.some((a) => a.includes("[WARNING]"));
  return (
    <Collapsible open={aberto} onOpenChange={setAberto} asChild>
      <>
        <tr className="hover:bg-peri-50/50 transition-colors">
          <td className="px-3 py-2 sticky left-0 bg-white">
            <CollapsibleTrigger asChild>
              <button
                aria-expanded={aberto}
                aria-controls={id}
                className="flex items-center gap-1.5 text-left hover:text-peri-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peri-400 rounded"
                title="Ver passos do cálculo"
              >
                <ChevronRight
                  className={cn(
                    "h-3.5 w-3.5 transition-transform",
                    aberto ? "rotate-90 text-peri-700" : "text-neutral-400",
                  )}
                  aria-hidden
                />
                <span className="font-medium">{nome}</span>
                {alertas.length > 0 && (
                  <AlertCircle
                    className={cn(
                      "h-3.5 w-3.5",
                      temErro ? "text-red-600" : temWarn ? "text-amber-600" : "text-neutral-400",
                    )}
                    aria-label={`${alertas.length} alerta(s)`}
                  />
                )}
              </button>
            </CollapsibleTrigger>
          </td>
          {rowContent}
        </tr>
        <CollapsibleContent asChild>
          <tr id={id} className="bg-neutral-50/60">
            <td colSpan={colSpan} className="px-6 py-4">
              <TraceConteudo trace={trace} alertas={alertas} />
            </td>
          </tr>
        </CollapsibleContent>
      </>
    </Collapsible>
  );
}

export function TraceConteudo({
  trace,
  alertas,
}: {
  trace: TraceItem[];
  alertas: string[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
      <div>
        <h4 className="font-medium text-navy-900 uppercase tracking-wide text-[10px] mb-2">
          Trace do cálculo (ordem de apuração)
        </h4>
        {trace.length === 0 ? (
          <p className="text-neutral-500">— nenhum passo registrado —</p>
        ) : (
          <ol className="space-y-1.5 border-l-2 border-peri-200 pl-3">
            {trace.map((t, i) => (
              <li key={i} className="grid grid-cols-[auto_1fr_auto] gap-3 items-baseline">
                <span className="text-peri-700 font-mono text-[10px] font-medium tabular-nums">
                  {t.etapa}
                </span>
                <span className="text-neutral-700">{t.descricao}</span>
                {t.valor !== undefined && (
                  <span className="font-medium text-navy-900 tabular-nums">{fmt.format(t.valor)}</span>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
      <div>
        <h4 className="font-medium text-navy-900 uppercase tracking-wide text-[10px] mb-2">
          Alertas de não-sobreposição
        </h4>
        {alertas.length === 0 ? (
          <p className="text-mint-700">✓ Nenhum alerta — ordem de apuração respeitada.</p>
        ) : (
          <ul className="space-y-1.5">
            {alertas.map((a, i) => {
              const sev = a.includes("[ERROR]")
                ? "ERROR"
                : a.includes("[WARNING]")
                ? "WARNING"
                : "INFO";
              const cor =
                sev === "ERROR"
                  ? "text-red-700 bg-red-50 ring-red-200"
                  : sev === "WARNING"
                  ? "text-amber-800 bg-amber-50 ring-amber-200"
                  : "text-neutral-700 bg-neutral-100 ring-neutral-200";
              return (
                <li key={i} className={`rounded ring-1 ring-inset px-2 py-1 ${cor}`}>
                  <span className="font-mono text-[10px] mr-1.5 opacity-70">{sev}</span>
                  {a.replace(/^\[[A-Z]+\]\s*/, "")}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
