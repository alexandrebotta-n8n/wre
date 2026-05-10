// Página estática /como-funciona — explica visualmente o fluxo de cálculo
// (LL Matriz → admin → RDA → Blocos A/B/C) e traz glossário dos termos.
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BookOpen } from "lucide-react";
import { auth } from "@/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Como funciona — WRE Simulador" };

export default async function ComoFuncionaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <main className="mx-auto max-w-[1100px] px-4 sm:px-6 py-6 space-y-6">
      <PageHeader
        breadcrumb={[{ label: "Início", href: "/simulacao" }, { label: "Como funciona" }]}
        title="Como o cálculo funciona"
        description="Do Lucro Líquido da matriz até o pacote de cada sócio: o caminho, as etapas e os parâmetros que você pode mexer."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/politica">
              <BookOpen className="h-3.5 w-3.5" /> Ver Política completa
            </Link>
          </Button>
        }
      />

      {/* Diagrama de fluxo */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-navy-900 mb-1">Modelo NOVO — fluxo do RDA</h2>
        <p className="text-sm text-neutral-600 mb-5">
          Os percentuais abaixo são os <strong>defaults</strong> da Política DSF. Cada cenário pode ajustá-los
          dentro das faixas autorizadas.
        </p>
        <FluxoNovo />
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-navy-900 mb-1">Modelo ATUAL — base de comparação</h2>
        <p className="text-sm text-neutral-600 mb-5">
          O modelo vigente no 1T2026 — usado como baseline para mostrar o impacto do novo modelo.
        </p>
        <FluxoAtual />
      </Card>

      {/* Etapas detalhadas */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-navy-900 mb-3">Etapas do cálculo (ordem de apuração)</h2>
        <ol className="space-y-4">
          <Etapa
            n={1}
            titulo="Pró-labore"
            formula="proLaboreMensal × meses × N sócios elegíveis"
            descricao="Pagamento mensal fixo. Vale para sócios em qualquer regime (capital ou serviços) com função operativa."
          />
          <Etapa
            n={2}
            titulo="Remuneração de gestão (Admin)"
            formula="tabelaSalarial[nível][faixa] × meses"
            descricao="Apenas para Sócios de Capital Gestores. Distinta da distribuição de capital — remunera a função formal de administração."
          />
          <Etapa
            n={3}
            titulo="Funding fundadores"
            formula="quotas × funding_unidade_fundadores"
            descricao="Devolução de capital aos fundadores conforme quotas, antes da distribuição residual."
          />
          <Etapa
            n={4}
            titulo="RDA — Resultado Distribuível Ajustado"
            formula="LL_matriz − admin"
            descricao="Lucro Líquido da matriz, deduzidos pró-labore, gestão e funding fundadores. É a base de cálculo dos blocos A/B/C."
          />
          <Etapa
            n={5}
            titulo="Bloco A — Parcela Institucional (45%)"
            formula="RDA × 45% × (quota_socio / Σquotas_PUBLICOS_CAPITAL)"
            descricao="Distribuição proporcional às quotas. Apenas Sócios de Capital. Retorno pelo risco do equity."
          />
          <Etapa
            n={6}
            titulo="Bloco B — Parcela de Performance (35%)"
            formula="RDA × 35%, distribuído conforme modo escolhido"
            descricao="4 modos: UNIFORME (igual entre elegíveis) | PESO_INDIVIDUAL | ORIGINACAO | POR_AREA (mix orgânico/incremental por área de prática). Pode incluir Sócios de Serviços."
          />
          <Etapa
            n={7}
            titulo="Bloco C — Parcela Estratégica (20%)"
            formula="RDA × 20% (retido na matriz)"
            descricao="Reserva estratégica para expansão, retenção, sucessão e projetos especiais. Não distribuído automaticamente."
          />
          <Etapa
            n={8}
            titulo="Pool de unidade (quando há líder de unidade)"
            formula="LL_unidade × { 50% Sociedade · 30% Líder · 20% Equipe/Reserva }"
            descricao="Aplicado SOBRE o resultado local de cada unidade. Líderes de unidade recebem o 30%. Distinto do sistema central."
          />
        </ol>
      </Card>

      {/* Glossário */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-navy-900 mb-3">Glossário</h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <Termo termo="LL Matriz" def="Lucro Líquido da sociedade central, antes de qualquer alocação de partnership." />
          <Termo termo="RDA" def="Resultado Distribuível Ajustado — o LL após pró-labore, gestão e funding fundadores. Base dos blocos." />
          <Termo termo="Bloco A" def="Parcela Institucional (45% do RDA por padrão) — destinada exclusivamente a Sócios de Capital, proporcional às quotas." />
          <Termo termo="Bloco B" def="Parcela de Performance (35%) — pode contemplar Sócios de Capital e de Serviços; distribuída por critério escolhido." />
          <Termo termo="Bloco C" def="Parcela Estratégica e de Longo Prazo (20%) — reserva para expansão, retenção, sucessão." />
          <Termo termo="Pool S/L/E" def="Pool de unidade: Sociedade (50%) / Líder (30%) / Equipe-Reserva (20%) — aplicado sobre o LL da unidade." />
          <Termo termo="Chave O/E/G" def="Chave-padrão interunidades: Originação 30% / Execução 60% / Gestão 10% — para serviços com captação em uma unidade e execução em outra." />
          <Termo termo="POR_AREA" def="Modo de distribuição do Bloco B: pondera peso orgânico (76%) e incremental (24%) por área de prática (Cível, Trabalhista, etc)." />
          <Termo termo="Faixas mín/máx" def="Limites de flexibilidade controlada para ajustar a chave O/E/G no caso concreto, com justificativa." />
          <Termo termo="PUBLICOS_CAPITAL" def="Sócios elegíveis ao Bloco A — categoria que abrange capital pleno e capital em vesting consolidado." />
        </dl>
      </Card>

      {/* CTA */}
      <Card className="p-6 bg-peri-50/40 border-peri-200">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="flex-1 min-w-[220px]">
            <h3 className="font-semibold text-navy-900">Pronto para simular?</h3>
            <p className="text-sm text-neutral-700 mt-1">
              A página de Simulação mostra dois cenários lado a lado. Clique em qualquer sócio na tabela
              para ver a composição passo a passo do pacote dele.
            </p>
          </div>
          <Button asChild variant="primary" size="sm">
            <Link href="/simulacao">
              Ir para Simulação <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </Card>
    </main>
  );
}

function FluxoNovo() {
  return (
    <div className="space-y-3">
      <NoFluxo nome="LL Matriz" sub="Lucro líquido apurado" cor="navy" />
      <Conector label="− admin (pró-labore + gestão + funding fundadores)" />
      <NoFluxo nome="RDA" sub="Resultado Distribuível Ajustado" cor="peri" destaque />
      <Conector label="dividido em 3 blocos" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <BlocoCard
          letra="A"
          pct="45%"
          titulo="Institucional"
          publico="Apenas Sócios de Capital"
          metodo="Proporcional às quotas"
          cor="mint"
        />
        <BlocoCard
          letra="B"
          pct="35%"
          titulo="Performance"
          publico="Capital + Serviços (conforme avaliação)"
          metodo="Uniforme · Individual · Originação · Por área"
          cor="peri"
        />
        <BlocoCard
          letra="C"
          pct="20%"
          titulo="Estratégica"
          publico="Retido na matriz"
          metodo="Expansão, retenção, sucessão"
          cor="amber"
        />
      </div>
    </div>
  );
}

function FluxoAtual() {
  return (
    <div className="space-y-3">
      <NoFluxo nome="LL Matriz" sub="Lucro líquido apurado" cor="navy" />
      <Conector label="− pró-labore − gestão − funding fundadores" />
      <NoFluxo nome="Funding residual" sub="LL − rem. fundadores" cor="peri" destaque />
      <Conector label="reserva 5% (vira prêmio uniforme se ativado)" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <NoFluxo nome="Distribuição por quotas" sub="(quota / Σquotas_não-fund) × funding × (1 − reserva%)" cor="mint" />
        <NoFluxo nome="Prêmio uniforme" sub="reserva ÷ N elegíveis" cor="amber" />
      </div>
    </div>
  );
}

function NoFluxo({
  nome,
  sub,
  cor,
  destaque,
}: {
  nome: string;
  sub: string;
  cor: "navy" | "peri" | "mint" | "amber";
  destaque?: boolean;
}) {
  const corMap = {
    navy: "bg-navy-50 border-navy-200 text-navy-900",
    peri: "bg-peri-50 border-peri-300 text-peri-900",
    mint: "bg-mint-50 border-mint-200 text-mint-900",
    amber: "bg-amber-50 border-amber-200 text-amber-900",
  };
  return (
    <div
      className={
        "rounded-lg border-2 px-4 py-3 " +
        corMap[cor] +
        (destaque ? " shadow-sm ring-1 ring-peri-300" : "")
      }
    >
      <div className="font-semibold text-base">{nome}</div>
      <div className="text-xs opacity-80 mt-0.5">{sub}</div>
    </div>
  );
}

function Conector({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-1">
      <div className="h-4 w-px bg-neutral-300" />
      <span className="text-[11px] text-neutral-500 uppercase tracking-wider font-medium">{label}</span>
      <div className="h-4 w-px bg-neutral-300" />
    </div>
  );
}

function BlocoCard({
  letra,
  pct,
  titulo,
  publico,
  metodo,
  cor,
}: {
  letra: string;
  pct: string;
  titulo: string;
  publico: string;
  metodo: string;
  cor: "mint" | "peri" | "amber";
}) {
  const corMap = {
    mint: "border-mint-300 bg-mint-50/40",
    peri: "border-peri-300 bg-peri-50/40",
    amber: "border-amber-300 bg-amber-50/40",
  };
  const badgeMap = { mint: "success", peri: "info", amber: "warning" } as const;
  return (
    <div className={"rounded-lg border-2 p-4 " + corMap[cor]}>
      <div className="flex items-center justify-between">
        <span className="text-2xl font-bold text-navy-900">Bloco {letra}</span>
        <Badge variant={badgeMap[cor]} size="sm">{pct}</Badge>
      </div>
      <div className="font-semibold text-sm text-navy-900 mt-1">{titulo}</div>
      <div className="text-xs text-neutral-700 mt-2">
        <div className="font-medium text-neutral-900">Público:</div>
        <div>{publico}</div>
      </div>
      <div className="text-xs text-neutral-700 mt-2">
        <div className="font-medium text-neutral-900">Método:</div>
        <div>{metodo}</div>
      </div>
    </div>
  );
}

function Etapa({
  n,
  titulo,
  formula,
  descricao,
}: {
  n: number;
  titulo: string;
  formula: string;
  descricao: string;
}) {
  return (
    <li className="flex gap-3 items-start">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-peri-100 text-peri-800 font-semibold text-sm inline-flex items-center justify-center">
        {n}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-navy-900 text-sm">{titulo}</div>
        <code className="block text-[11px] font-mono text-peri-800 bg-peri-50/60 rounded px-2 py-1 mt-1 break-all">
          {formula}
        </code>
        <p className="text-xs text-neutral-700 mt-1.5 leading-relaxed">{descricao}</p>
      </div>
    </li>
  );
}

function Termo({ termo, def }: { termo: string; def: string }) {
  return (
    <div>
      <dt className="font-semibold text-navy-900 text-sm">{termo}</dt>
      <dd className="text-xs text-neutral-700 mt-0.5 leading-relaxed">{def}</dd>
    </div>
  );
}
