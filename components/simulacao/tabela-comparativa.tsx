// Tabela alinhada por sócio: linhas A vs B + Δ.
// Cada linha é expansível (Radix Collapsible) para mostrar o waterfall do trace.
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
}: {
  linhas: LinhaComparativa[];
  temA: boolean;
  temB: boolean;
  nomeA?: string;
  nomeB?: string;
}) {
  const totalA = linhas.reduce((acc, l) => acc + (l.totalA ?? 0), 0);
  const totalB = linhas.reduce((acc, l) => acc + (l.totalB ?? 0), 0);
  const diffTotal = totalB - totalA;
  const diffPctTotal = totalA > 0 ? diffTotal / totalA : null;

  const podeCompararDiff = temA && temB;
  const colSpan = 1 + 2 + (podeCompararDiff ? 2 : 0);

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div>
          <CardTitle>Pacotes por sócio</CardTitle>
          <CardDescription>
            Linhas alinhadas por sócio. Ordenado por |Δ| decrescente.
            {!podeCompararDiff ? " — selecione 2 cenários para ver o diff." : ""}{" "}
            <span className="text-neutral-400">·</span> Clique no nome para abrir a composição passo-a-passo.
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
          </div>
        )}
      </CardHeader>
      <TableShell caption="Pacotes calculados por sócio">
        <THead>
          <tr>
            <TH className="px-4">Sócio</TH>
            <TH className="text-right">Total {temA ? "A" : ""}{nomeA ? ` · ${truncar(nomeA)}` : ""}</TH>
            <TH className="text-right">Total {temB ? "B" : ""}{nomeB ? ` · ${truncar(nomeB)}` : ""}</TH>
            {podeCompararDiff && <TH className="text-right">Δ R$</TH>}
            {podeCompararDiff && <TH className="text-right">Δ %</TH>}
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
              colSpan={colSpan}
              nomeA={nomeA}
              nomeB={nomeB}
            />
          ))}
          {linhas.length > 0 && (
            <tr className="bg-neutral-50 font-semibold">
              <td className="px-4 py-2.5">Total geral</td>
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
            </tr>
          )}
        </TBody>
      </TableShell>
    </Card>
  );
}

function truncar(s: string, n = 24): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
