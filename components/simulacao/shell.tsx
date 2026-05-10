// Shell server component da página /simulacao.
// Layout: Drawer (esquerda) + topbar (período + ações globais) + 2 colunas.
import Link from "next/link";
import { Eye, Download, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ColunaCenario } from "./coluna-cenario";
import { ColunaEmpty } from "./coluna-empty";
import { SeletorPeriodo } from "./seletor-periodo";
import { DrawerCenarios } from "./drawer-cenarios";
import { TabelaComparativa } from "./tabela-comparativa";
import type {
  CenarioListItem,
  CenarioCompleto,
  PremissaOption,
  PeriodoOption,
  AreaOption,
  LinhaComparativa,
} from "./types";
import { construirLinhasComparativas } from "./linhas";

export interface SimulacaoShellProps {
  cenarios: CenarioListItem[];
  premissas: PremissaOption[];
  periodos: PeriodoOption[];
  areas: AreaOption[];
  cenarioA: CenarioCompleto | null;
  cenarioB: CenarioCompleto | null;
  periodoIdSelecionado: string;
  podeMutar: boolean;
  ehSocioRestrito: boolean;
  modoNome: "completo" | "iniciais";
  drawerAberto: boolean;
}

export function SimulacaoShell(props: SimulacaoShellProps) {
  const linhas: LinhaComparativa[] = construirLinhasComparativas(
    props.cenarioA,
    props.cenarioB,
    props.modoNome,
  );

  const aId = props.cenarioA?.id ?? "";
  const bId = props.cenarioB?.id ?? "";
  const periodoId = props.periodoIdSelecionado;

  // A=ATUAL (baseline), B=NOVO (proposta) — ordem de leitura natural.
  // Se a coluna está vazia, sugerimos criar com a premissa default daquele modelo.
  const premissaDefaultAtual = props.premissas.find((p) => p.modelo === "ATUAL");
  const premissaDefaultNovo = props.premissas.find((p) => p.modelo === "NOVO");

  const apresentarHref =
    aId && periodoId
      ? `/apresentacao?a=${aId}${bId ? `&b=${bId}` : ""}&periodoId=${periodoId}`
      : "/apresentacao";

  return (
    <main className="mx-auto max-w-[1600px] px-4 sm:px-6 py-6 space-y-5">
      <PageHeader
        title="Simulação"
        description="Compare cenários lado a lado, ajuste parâmetros e publique. Tudo em um só lugar."
        actions={
          <div className="flex items-center gap-2">
            <DrawerCenarios
              cenarios={props.cenarios}
              premissas={props.premissas}
              aId={aId}
              bId={bId}
              periodoId={periodoId}
              podeMutar={props.podeMutar}
              defaultOpen={props.drawerAberto}
            />
            <Button asChild variant="outline" size="sm">
              <Link href={apresentarHref}>
                <Eye className="h-3.5 w-3.5" /> Apresentar
              </Link>
            </Button>
            {aId && (
              <Button asChild variant="outline" size="sm">
                <a href={`/api/cenarios/${aId}/exportar`}>
                  <Download className="h-3.5 w-3.5" /> XLSX
                </a>
              </Button>
            )}
          </div>
        }
      />

      {/* Topbar — período global */}
      <div className="flex items-center gap-3 flex-wrap">
        <SeletorPeriodo
          periodos={props.periodos}
          selecionado={periodoId}
          aId={aId}
          bId={bId}
        />
        <span className="text-xs text-neutral-500 inline-flex items-center gap-1">
          <Filter className="h-3 w-3" /> Trocar período recarrega ambos os lados.
        </span>
      </div>

      {/* 2 colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {props.cenarioA ? (
          <ColunaCenario
            slot="a"
            cenario={props.cenarioA}
            outroCenarioId={bId}
            periodoId={periodoId}
            areas={props.areas}
            podeMutar={props.podeMutar && !props.ehSocioRestrito}
            modoNome={props.modoNome}
          />
        ) : (
          <ColunaEmpty
            slot="a"
            outroCenarioId={bId}
            periodoId={periodoId}
            modeloSugerido="ATUAL"
            premissaDefaultId={premissaDefaultAtual?.id}
            premissaDefaultNome={premissaDefaultAtual?.nome}
            podeMutar={props.podeMutar && !props.ehSocioRestrito}
          />
        )}
        {props.cenarioB ? (
          <ColunaCenario
            slot="b"
            cenario={props.cenarioB}
            outroCenarioId={aId}
            periodoId={periodoId}
            areas={props.areas}
            podeMutar={props.podeMutar && !props.ehSocioRestrito}
            modoNome={props.modoNome}
          />
        ) : (
          <ColunaEmpty
            slot="b"
            outroCenarioId={aId}
            periodoId={periodoId}
            modeloSugerido="NOVO"
            premissaDefaultId={premissaDefaultNovo?.id}
            premissaDefaultNome={premissaDefaultNovo?.nome}
            podeMutar={props.podeMutar && !props.ehSocioRestrito}
          />
        )}
      </div>

      {/* Tabela comparativa alinhada */}
      {(props.cenarioA || props.cenarioB) && (
        <TabelaComparativa
          linhas={linhas}
          temA={!!props.cenarioA}
          temB={!!props.cenarioB}
          nomeA={props.cenarioA?.nome}
          nomeB={props.cenarioB?.nome}
        />
      )}
    </main>
  );
}
