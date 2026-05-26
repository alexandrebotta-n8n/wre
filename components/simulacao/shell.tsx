// Shell server component da página /simulacao.
// Layout: painéis globais (topo) + 2 colunas (A | B) + drawer lateral.
// Visão ANUAL única (sem drill-down trimestral).
import Link from "next/link";
import { Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ColunaCenario } from "./coluna-cenario";
import { ColunaEmpty } from "./coluna-empty";
import { DrawerCenarios } from "./drawer-cenarios";
import { AjudaDrawer } from "./ajuda-drawer";
import { TourOnboarding } from "./tour-onboarding";
import { TabelaComparativa } from "./tabela-comparativa";
import { PainelGlobais, type UnidadeGlobal } from "./painel-globais";
import type {
  CenarioListItem,
  CenarioCompleto,
  PremissaOption,
  AreaOption,
  LinhaComparativa,
} from "./types";
import { construirLinhasComparativas } from "./linhas";

export interface SimulacaoShellProps {
  cenarios: CenarioListItem[];
  premissas: PremissaOption[];
  areas: AreaOption[];
  cenarioA: CenarioCompleto | null;
  cenarioB: CenarioCompleto | null;
  podeMutar: boolean;
  ehSocioRestrito: boolean;
  modoNome: "completo" | "iniciais";
  drawerAberto: boolean;
  /** Se true, exibe o tour de boas-vindas (1ª visita). */
  mostrarTour: boolean;
  /** Ano de referência para os painéis globais. */
  ano: number;
  unidadesGlobais: UnidadeGlobal[];
  cenariosDraftDoAno: number;
}

export function SimulacaoShell(props: SimulacaoShellProps) {
  const linhas: LinhaComparativa[] = construirLinhasComparativas(
    props.cenarioA,
    props.cenarioB,
    props.modoNome,
  );

  const aId = props.cenarioA?.id ?? "";
  const bId = props.cenarioB?.id ?? "";

  // A=ATUAL (baseline), B=NOVO (proposta) — ordem de leitura natural.
  // Se a coluna está vazia, sugerimos criar com a premissa default daquele modelo.
  const premissaDefaultAtual = props.premissas.find((p) => p.modelo === "ATUAL");
  const premissaDefaultNovo = props.premissas.find((p) => p.modelo === "NOVO");

  const apresentarHref = aId
    ? `/apresentacao?a=${aId}${bId ? `&b=${bId}` : ""}`
    : "/apresentacao";

  return (
    <main className="mx-auto max-w-[1600px] px-4 sm:px-6 py-6 space-y-5">
      <PageHeader
        title="Simulação"
        description="Compare cenários lado a lado em base anual. Edite as variáveis globais no topo para refletir em todos os cenários."
        actions={
          <div className="flex items-center gap-2">
            <span data-tour="cenarios">
              <DrawerCenarios
                cenarios={props.cenarios}
                premissas={props.premissas}
                aId={aId}
                bId={bId}
                podeMutar={props.podeMutar}
                defaultOpen={props.drawerAberto}
              />
            </span>
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
            <span data-tour="ajuda">
              <AjudaDrawer iconOnly />
            </span>
          </div>
        }
      />

      {/* Painel de variáveis globais (só para editores) */}
      {props.podeMutar && !props.ehSocioRestrito && (
        <PainelGlobais
          ano={props.ano}
          unidades={props.unidadesGlobais}
          cenariosDraftDoAno={props.cenariosDraftDoAno}
          aId={aId || undefined}
          bId={bId || undefined}
        />
      )}

      {/* 2 colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {props.cenarioA ? (
          <ColunaCenario
            slot="a"
            cenario={props.cenarioA}
            outroCenarioId={bId}
            areas={props.areas}
            podeMutar={props.podeMutar && !props.ehSocioRestrito}
            modoNome={props.modoNome}
          />
        ) : (
          <ColunaEmpty
            slot="a"
            outroCenarioId={bId}
            modeloSugerido="ATUAL"
            premissaDefaultId={premissaDefaultAtual?.id}
            premissaDefaultNome={premissaDefaultAtual?.nome}
            premissaOutroId={premissaDefaultNovo?.id}
            podeMutar={props.podeMutar && !props.ehSocioRestrito}
          />
        )}
        {props.cenarioB ? (
          <ColunaCenario
            slot="b"
            cenario={props.cenarioB}
            outroCenarioId={aId}
            areas={props.areas}
            podeMutar={props.podeMutar && !props.ehSocioRestrito}
            modoNome={props.modoNome}
          />
        ) : (
          <ColunaEmpty
            slot="b"
            outroCenarioId={aId}
            modeloSugerido="NOVO"
            premissaDefaultId={premissaDefaultNovo?.id}
            premissaDefaultNome={premissaDefaultNovo?.nome}
            premissaOutroId={premissaDefaultAtual?.id}
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
          reservaB={props.cenarioB?.totalReservaCentral ?? null}
          drawerHref={(() => {
            const sp = new URLSearchParams();
            if (aId) sp.set("a", aId);
            if (bId) sp.set("b", bId);
            sp.set("drawer", "1");
            return `/simulacao?${sp.toString()}`;
          })()}
        />
      )}
      <TourOnboarding mostrar={props.mostrarTour} />
    </main>
  );
}
