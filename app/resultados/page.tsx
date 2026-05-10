// /resultados — CRUD central dos LL/funding por período × unidade.
// Apenas ADMIN/CONSULTOR. Sócios restritos não acessam (são números sensíveis).
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { escopoDe } from "@/lib/auth/escopo";
import type { SessionUser } from "@/lib/auth/guards";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TabelaResultados } from "./tabela-resultados";
import { NovoPeriodoDialog } from "./novo-periodo-dialog";

export const metadata = { title: "Resultados financeiros — WRE Simulador" };

export default async function ResultadosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const escopo = escopoDe(session.user as SessionUser);
  if (!escopo.podeMutar) redirect("/simulacao");

  const [periodos, unidades, resultados] = await Promise.all([
    prisma.periodo.findMany({
      orderBy: [{ ano: "desc" }, { tipo: "asc" }, { trimestre: "asc" }],
      take: 100,
    }),
    prisma.unidade.findMany({
      where: { ativa: true },
      orderBy: [{ isMatriz: "desc" }, { codigo: "asc" }],
      take: 50,
    }),
    prisma.resultadoPeriodo.findMany({
      orderBy: [{ periodo: { ano: "desc" } }, { periodo: { trimestre: "asc" } }],
      take: 500,
      include: { periodo: true, unidade: true },
    }),
  ]);

  // Construir mapa: chave = `${periodoId}|${unidadeId}` → resultado (ou undefined)
  const mapa = new Map<string, (typeof resultados)[number]>();
  for (const r of resultados) {
    mapa.set(`${r.periodoId}|${r.unidadeId}`, r);
  }

  return (
    <main className="mx-auto max-w-[1500px] px-4 sm:px-6 py-6 space-y-5">
      <PageHeader
        breadcrumb={[{ label: "Início", href: "/simulacao" }, { label: "Resultados" }]}
        title="Resultados financeiros"
        description="Lucro Líquido e Funding Variável por período × unidade. Insumo principal das simulações."
        meta={
          <>
            <Badge variant="info" size="sm">{resultados.length} resultado(s)</Badge>
            <span className="text-neutral-500">·</span>
            <Badge variant="success" size="sm">{periodos.length} período(s)</Badge>
            <span className="text-neutral-500">·</span>
            <Badge size="sm">{unidades.length} unidade(s)</Badge>
          </>
        }
        actions={<NovoPeriodoDialog />}
      />

      <Card className="p-4 bg-amber-50/40 border-amber-200">
        <p className="text-xs text-neutral-700 leading-relaxed">
          <strong className="text-amber-900">Como funciona:</strong> os valores aqui são os{" "}
          <strong>defaults oficiais</strong>. Cada cenário pode sobrescrever individualmente os LLs no
          painel <em>📊 Insumos</em> da Simulação, sem afetar estes números. Use{" "}
          <strong>Real</strong> para resultados consolidados e <strong>Orçado</strong> para projeções.
        </p>
      </Card>

      <Card className="overflow-hidden">
        <TabelaResultados periodos={periodos} unidades={unidades} mapa={Object.fromEntries(mapa)} />
      </Card>
    </main>
  );
}
