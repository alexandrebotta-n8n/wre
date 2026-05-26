// Tabela alinhada por sócio: linhas A vs B + Δ.
// Cada linha é expansível (Radix Collapsible) para mostrar o waterfall do trace.
// Modo single (apenas um cenário): esconde Δ e mostra uma única coluna de Total.
import Link from "next/link";
import { Plus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TableShell, THead, TBody, TH } from "@/components/ui/data-table";
import { brl, pct } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { LinhaComparativa } from "./types";
import { LinhaSocio } from "./linha-socio";

export function TabelaComparativa({
  linhas,
  temA,
  temB,
  nomeA,
  nomeB,
  drawerHref,
  reservaB,
}: {
  linhas: LinhaComparativa[];
  temA: boolean;
  temB: boolean;
  nomeA?: string;
  nomeB?: string;
  drawerHref?: string;
  /** Reserva central (Bloco C não distribuído) do cenário B/NOVO. Quando
   *  presente, é exibida abaixo do "Diff total (B−A)" como contrapeso —
   *  ajuda o leitor a contextualizar o gap negativo (parte vai pra reserva). */
  reservaB?: number | null;
}) {
  const totalA = linhas.reduce((acc, l) => acc + (l.totalA ?? 0), 0);
  const totalB = linhas.reduce((acc, l) => acc + (l.totalB ?? 0), 0);
  const diffTotal = totalB - totalA;
  const diffPctTotal = totalA > 0 ? diffTotal / totalA : null;

  const podeCompararDiff = temA && temB;
  const single = !podeCompararDiff && (temA || temB);
  const lado: "a" | "b" | null = single ? (temA ? "a" : "b") : null;
  const nomeUnico = lado === "a" ? nomeA : lado === "b" ? nomeB : undefined;
  const totalUnico = lado === "a" ? totalA : totalB;

  // Modo comparativo: Sócio + Classif + Total A + Total B + Δ R$ + Δ %  → 6
  // Modo single:     Sócio + Classif + Total                            → 3
  const colSpan = single ? 3 : 2 + 2 + (podeCompararDiff ? 2 : 0);

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div>
          <CardTitle>
            Pacotes por sócio
            {single && nomeUnico && (
              <span className="ml-2 font-normal text-neutral-500">· {nomeUnico}</span>
            )}
          </CardTitle>
          <CardDescription>
            {single ? (
              <>
                Visão de 1 cenário. Adicione um segundo cenário em qualquer coluna para comparar.
              </>
            ) : (
              <>
                Linhas alinhadas por sócio. Ordem: fundadores → sócios de capital
                (por equity desc) → serviços/líderes (alfabético).
                <span className="text-neutral-400"> · </span>
                Clique no nome para abrir a composição passo-a-passo.
              </>
            )}
          </CardDescription>
        </div>
        {podeCompararDiff && (
          <div className="text-right text-xs">
            <div className="text-neutral-500">Diff total (B − A)</div>
            <div className={cn("text-base font-semibold tabular-nums", diffTotal >= 0 ? "text-mint-700" : "text-red-700")}>
              {diffTotal >= 0 ? "+" : ""}{brl(diffTotal, true)}
              {diffPctTotal !== null && (
                <span className="ml-2 font-normal text-xs">({diffTotal >= 0 ? "+" : ""}{pct(diffPctTotal)})</span>
              )}
            </div>
            {reservaB != null && reservaB > 0 && (
              <div className="text-[11px] text-neutral-500 mt-1">
                Reserva (NOVO): <span className="font-medium text-navy-900 tabular-nums">{brl(reservaB, true)}</span>
                <span className="ml-1 text-neutral-400">— Bloco C não distribuído</span>
              </div>
            )}
          </div>
        )}
      </CardHeader>
      <TableShell caption="Pacotes calculados por sócio">
        <THead>
          <tr>
            <TH className="px-4">Sócio</TH>
            <TH>Classificação</TH>
            {single ? (
              <TH className="text-right">Total</TH>
            ) : (
              <>
                <TH className="text-right">Total {temA ? "A" : ""}{nomeA ? ` · ${truncar(nomeA)}` : ""}</TH>
                <TH className="text-right">Total {temB ? "B" : ""}{nomeB ? ` · ${truncar(nomeB)}` : ""}</TH>
                {podeCompararDiff && <TH className="text-right">Δ R$</TH>}
                {podeCompararDiff && <TH className="text-right">Δ %</TH>}
              </>
            )}
          </tr>
        </THead>
        <TBody>
          {linhas.length === 0 && (
            <tr>
              <td colSpan={colSpan} className="text-center py-8 text-sm text-neutral-500">
                Nenhum pacote calculado ainda. Use &ldquo;Calcular&rdquo; em alguma coluna.
              </td>
            </tr>
          )}
          {linhas.map((l) => (
            <LinhaSocio
              key={l.socioId}
              linha={l}
              podeCompararDiff={podeCompararDiff}
              singleLado={lado}
              colSpan={colSpan}
              nomeA={nomeA}
              nomeB={nomeB}
            />
          ))}
          {linhas.length > 0 && (
            <tr className="bg-neutral-50 font-semibold">
              <td className="px-4 py-2.5">Total geral</td>
              <td />
              {single ? (
                <td className="px-3 py-2.5 text-right tabular-nums">{brl(totalUnico, true)}</td>
              ) : (
                <>
                  <td className="px-3 py-2.5 text-right tabular-nums">{brl(totalA, true)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{brl(totalB, true)}</td>
                  {podeCompararDiff && (
                    <td className={cn("px-3 py-2.5 text-right tabular-nums", diffTotal >= 0 ? "text-mint-700" : "text-red-700")}>
                      {diffTotal >= 0 ? "+" : ""}{brl(diffTotal, true)}
                    </td>
                  )}
                  {podeCompararDiff && (
                    <td className={cn("px-3 py-2.5 text-right tabular-nums text-xs", diffTotal >= 0 ? "text-mint-700" : "text-red-700")}>
                      {diffPctTotal === null ? "—" : (diffTotal >= 0 ? "+" : "") + pct(diffPctTotal)}
                    </td>
                  )}
                </>
              )}
            </tr>
          )}
        </TBody>
      </TableShell>
      {single && drawerHref && (
        <div className="px-4 py-3 border-t border-neutral-100 bg-neutral-50/50">
          <Link
            href={drawerHref}
            className="inline-flex items-center gap-1.5 text-xs text-peri-700 hover:text-peri-900 hover:underline"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar cenário para comparar
          </Link>
        </div>
      )}
    </Card>
  );
}

function truncar(s: string, n = 24): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
