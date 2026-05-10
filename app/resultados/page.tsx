// /resultados — CRUD central dos insumos financeiros em 3 camadas:
//   1. DSF Global  → ResultadoPeriodo na unidade matriz (consolidado).
//   2. Unidades    → ResultadoPeriodo nas demais unidades.
//   3. Individuais → OriginacaoPeriodo por sócio × período.
// Apenas ADMIN/CONSULTOR. Sócios restritos não acessam.
import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Building, UserSquare2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { escopoDe } from "@/lib/auth/escopo";
import type { SessionUser } from "@/lib/auth/guards";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TabelaResultados } from "./tabela-resultados";
import { TabelaOriginacao } from "./tabela-originacao";
import { NovoPeriodoDialog } from "./novo-periodo-dialog";

export const metadata = { title: "Resultados financeiros — WRE Simulador" };

type Tab = "global" | "unidades" | "originacao";

export default async function ResultadosPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await searchParams;
  const tab: Tab =
    sp.tab === "unidades" || sp.tab === "originacao" ? sp.tab : "global";

  const session = await auth();
  if (!session?.user) redirect("/login");
  const escopo = escopoDe(session.user as SessionUser);
  if (!escopo.podeMutar) redirect("/simulacao");

  const [periodos, unidades, resultados, socios, originacoes] = await Promise.all([
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
    prisma.socio.findMany({
      where: { ativo: true },
      orderBy: [{ isFundador: "desc" }, { nome: "asc" }],
      take: 200,
      select: { id: true, nome: true, cargo: true },
    }),
    prisma.originacaoPeriodo.findMany({
      orderBy: [{ periodo: { ano: "desc" } }, { periodo: { trimestre: "asc" } }],
      take: 1000,
    }),
  ]);

  const matriz = unidades.filter((u) => u.isMatriz);
  const naoMatriz = unidades.filter((u) => !u.isMatriz);

  // Mapas: periodoId|unidadeId → resultado / socioId|periodoId → originacao
  const mapaResultado = new Map<string, (typeof resultados)[number]>();
  for (const r of resultados) mapaResultado.set(`${r.periodoId}|${r.unidadeId}`, r);
  const mapaOriginacao = new Map<string, (typeof originacoes)[number]>();
  for (const o of originacoes) mapaOriginacao.set(`${o.socioId}|${o.periodoId}`, o);

  const totalResultadosMatriz = resultados.filter((r) => r.unidade.isMatriz).length;
  const totalResultadosUnidades = resultados.filter((r) => !r.unidade.isMatriz).length;

  const tabs: Array<{
    id: Tab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge: number;
    descricao: string;
  }> = [
    {
      id: "global",
      label: "DSF Global",
      icon: Building2,
      badge: totalResultadosMatriz,
      descricao: "Consolidado da matriz — entrada principal do RDA central no engine NOVO.",
    },
    {
      id: "unidades",
      label: "Unidades",
      icon: Building,
      badge: totalResultadosUnidades,
      descricao: "Resultado por unidade não-matriz (BG e demais filiais) — base do pool local.",
    },
    {
      id: "originacao",
      label: "Individuais — Originação",
      icon: UserSquare2,
      badge: originacoes.length,
      descricao: "Receita originada por sócio. Multiplicada pela taxa de comissão da premissa NOVA.",
    },
  ];

  return (
    <main className="mx-auto max-w-[1500px] px-4 sm:px-6 py-6 space-y-5">
      <PageHeader
        breadcrumb={[{ label: "Início", href: "/simulacao" }, { label: "Resultados" }]}
        title="Resultados financeiros"
        description="Insumos das simulações em 3 camadas — DSF global, por unidade e por sócio."
        meta={
          <>
            <Badge variant="info" size="sm">{periodos.length} período(s)</Badge>
            <span className="text-neutral-500">·</span>
            <Badge size="sm">{unidades.length} unidade(s)</Badge>
            <span className="text-neutral-500">·</span>
            <Badge size="sm">{socios.length} sócio(s)</Badge>
          </>
        }
        actions={<NovoPeriodoDialog />}
      />

      <Card className="p-4 bg-amber-50/40 border-amber-200">
        <p className="text-xs text-neutral-700 leading-relaxed">
          <strong className="text-amber-900">Como funciona:</strong> os valores aqui são os{" "}
          <strong>defaults oficiais</strong> em 3 camadas:{" "}
          <strong>DSF Global</strong> alimenta o RDA central no engine NOVO,{" "}
          <strong>Unidades</strong> alimenta o pool 50/30/20 (sociedade/líder/equipe), e{" "}
          <strong>Originação</strong> alimenta a Comissão de Originação individual.
          Cada cenário pode sobrescrever LLs no painel <em>📊 Insumos</em> e a originação por sócio no painel{" "}
          <em>💰 Originação</em> da Simulação, sem afetar estes números. Use{" "}
          <strong>Real</strong> para consolidados e <strong>Orçado</strong> para projeções.
        </p>
      </Card>

      {/* Tabs */}
      <div className="border-b border-neutral-200 -mb-px">
        <nav className="flex flex-wrap gap-1" aria-label="Camadas de resultados">
          {tabs.map((t) => {
            const Icon = t.icon;
            const ativo = tab === t.id;
            return (
              <Link
                key={t.id}
                href={`/resultados?tab=${t.id}`}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                  ativo
                    ? "border-peri-600 text-peri-700"
                    : "border-transparent text-neutral-600 hover:text-navy-900 hover:border-neutral-300",
                )}
                aria-current={ativo ? "page" : undefined}
              >
                <Icon className="h-4 w-4" />
                {t.label}
                <Badge variant={ativo ? "info" : undefined} size="sm">{t.badge}</Badge>
              </Link>
            );
          })}
        </nav>
      </div>

      <p className="text-xs text-neutral-500 -mt-2">
        {tabs.find((t) => t.id === tab)?.descricao}
      </p>

      <Card className="overflow-hidden">
        {tab === "global" && (
          <TabelaResultados
            periodos={periodos}
            unidades={matriz}
            mapa={Object.fromEntries(mapaResultado)}
          />
        )}
        {tab === "unidades" && (
          <TabelaResultados
            periodos={periodos}
            unidades={naoMatriz}
            mapa={Object.fromEntries(mapaResultado)}
          />
        )}
        {tab === "originacao" && (
          <TabelaOriginacao
            periodos={periodos}
            socios={socios}
            mapa={Object.fromEntries(mapaOriginacao)}
          />
        )}
      </Card>
    </main>
  );
}
