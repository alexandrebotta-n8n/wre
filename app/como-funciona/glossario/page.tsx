// Glossário expandido do modelo DSF, com cross-links para temas da Política.
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

export const metadata = { title: "Glossário — Como funciona" };

interface Termo {
  termo: string;
  def: string;
  refs?: { href: string; label: string }[];
}

const TERMOS: Termo[] = [
  {
    termo: "LL Matriz",
    def: "Lucro Líquido da sociedade central, antes de qualquer alocação de partnership.",
  },
  {
    termo: "RDA",
    def: "Resultado Distribuível Ajustado — o LL após pró-labore, gestão e funding fundadores. Base dos blocos A/B/C.",
    refs: [{ href: "/politica/blocos", label: "Cláusula 9 (Blocos)" }],
  },
  {
    termo: "Bloco A",
    def: "Parcela Institucional (45% do RDA por padrão) — destinada a Sócios de Capital NÃO-fundadores, proporcional às quotas. Fundadores recebem o valor discricionário em etapa separada (abatido do LL antes do RDA) e ficam fora do Bloco A.",
    refs: [{ href: "/politica/blocos", label: "Política · Blocos" }],
  },
  {
    termo: "Bloco B",
    def: "Parcela de Performance (35%) — pode contemplar Sócios de Capital e de Serviços; distribuída por critério escolhido (UNIFORME, PESO_INDIVIDUAL, ORIGINACAO ou POR_AREA).",
    refs: [{ href: "/politica/blocos", label: "Política · Blocos" }, { href: "/politica/pesos-perfil-area", label: "Pesos por área" }],
  },
  {
    termo: "Bloco C",
    def: "Parcela Estratégica e de Longo Prazo (20%) — reserva para expansão, retenção, sucessão. Não distribui automaticamente entre sócios; fica retida na matriz.",
    refs: [{ href: "/politica/expansao", label: "Cláusula 14 (Expansão)" }],
  },
  {
    termo: "Comissão de Originação",
    def: "Componente individual do pacote NOVO: taxa configurável (taxaComissaoOriginacao na premissa) aplicada sobre a receita anual que cada sócio originou. O valor 'originado' vem do cadastro permanente do sócio em /socios, campo 'Originação anual padrão'.",
    refs: [{ href: "/socios", label: "/socios" }, { href: "/politica/categorias-socio", label: "Categorias e regras" }],
  },
  {
    termo: "Pró-labore (Política DSF v1)",
    def: "Pagamento mensal fixo (proLaboreMensal × meses) aplicado a todas as 6 categorias da nova política. Configurado na Premissa NOVA. Distinto da Remuneração de Administração, que só vai para Capital Gestor.",
    refs: [{ href: "/politica/categorias-socio", label: "Categorias" }],
  },
  {
    termo: "Classificação (Política DSF v1)",
    def: "Atributo permanente do sócio (campo publicoDefault) que define em qual das 6 categorias da nova política ele se enquadra. Definido em /socios e herdado para a ClassificacaoSocio em cada novo cenário.",
    refs: [{ href: "/politica/categorias-socio", label: "6 Categorias" }],
  },
  {
    termo: "Variáveis globais (anuais)",
    def: "Insumos editados no painel do topo de /simulacao que afetam TODOS os cenários DRAFT do ano: LL DSF global (matriz) e LL de cada unidade não-matriz. Originação e funding fundador foram movidos pro cadastro permanente do sócio (/socios). Mudar qualquer global marca os DRAFTs como dirty — recalcule cada um.",
    refs: [{ href: "/simulacao", label: "Painel /simulacao" }, { href: "/socios", label: "/socios (originação e funding)" }],
  },
  {
    termo: "Default (matriz)",
    def: "Status na matriz Mecanismo × Categoria: o sócio daquela categoria recebe esse mecanismo automaticamente, sem condição adicional. Ex.: Sócio de Capital recebe Bloco A por Default.",
    refs: [{ href: "/politica/categorias-socio", label: "Matriz oficial" }],
  },
  {
    termo: "Não aplicável (N/A)",
    def: "Status na matriz: a categoria nunca recebe esse mecanismo, independentemente de cadastro ou cenário. Ex.: Líder Non-Equity não recebe Pró-labore nem Bloco B.",
    refs: [{ href: "/politica/categorias-socio", label: "Matriz oficial" }],
  },
  {
    termo: "Excepcional (matriz)",
    def: "Status na matriz: aplicação não é automática — depende de decisão discricionária do Comitê. É o status do Bloco C para todas as 6 categorias (reserva estratégica retida).",
    refs: [{ href: "/politica/expansao", label: "Bloco C / reserva" }],
  },
  {
    termo: "Condicionado (matriz)",
    def: "Status na matriz: o sócio só recebe esse mecanismo se uma condição específica for atendida. No engine, traduz-se em ‘ter nivelCargo + faixaSalarial cadastrados’. Aplica-se à Remuneração de Administração para Capital Líder e Serviços Estratégico.",
    refs: [{ href: "/politica/categorias-socio", label: "Matriz oficial" }],
  },
  {
    termo: "Cumulativo (matriz)",
    def: "Status na matriz: o mecanismo se aplica sempre que o sócio gerar o fato gerador, somando-se aos demais componentes do pacote. É o status dos Créditos de Originação, Execução e Gestão para todas as 6 categorias.",
    refs: [{ href: "/socios", label: "Originação por sócio" }],
  },
  {
    termo: "Pool S/L/E",
    def: "Pool de unidade: Sociedade (50%) / Líder (30%) / Equipe-Reserva (20%) — aplicado sobre o LL local de cada unidade não-matriz.",
    refs: [{ href: "/politica/pool-unidade", label: "Cláusula 10 (Pool)" }, { href: "/politica/lideres-unidade", label: "Líderes" }],
  },
  {
    termo: "Chave O/E/G",
    def: "Chave-padrão interunidades: Originação 30% / Execução 60% / Gestão 10% — para serviços com captação em uma unidade e execução em outra. Faixas de ajuste autorizadas: O 20-40, E 50-70, G 0-15.",
    refs: [{ href: "/politica/pool-unidade", label: "Anexo VII · Critério híbrido" }],
  },
  {
    termo: "POR_AREA",
    def: "Modo de distribuição do Bloco B: pondera peso orgânico (76%) e incremental (24%) por área de prática (Cível, Trabalhista, etc).",
    refs: [{ href: "/politica/pesos-perfil-area", label: "Pesos por área" }],
  },
  {
    termo: "Vesting",
    def: "Aquisição/integralização gradual de quotas, condicionada à permanência e atingimento de metas. Quotas não vestidas podem ser revertidas em caso de saída.",
    refs: [{ href: "/politica/progressao-vesting", label: "Cláusula 5 + Anexo IV" }],
  },
  {
    termo: "Cliff",
    def: "Período inicial do vesting (usualmente 12 meses) durante o qual nenhuma quota é consolidada. Saída antes do cliff = perda total da parcela em vesting.",
    refs: [{ href: "/politica/progressao-vesting", label: "Vesting" }],
  },
  {
    termo: "Bad leaver",
    def: "Saída por descumprimento grave, baixa performance reiterada ou quebra de obrigações. Implica em recompra a valor patrimonial e reversão de quotas em vesting.",
    refs: [{ href: "/politica/permanencia-saida", label: "Cláusulas 12 e 13" }],
  },
  {
    termo: "Good leaver",
    def: "Saída amigável, aposentadoria, morte ou invalidez. Valuation segue o Acordo de Sócios vigente, sem desconto adicional.",
    refs: [{ href: "/politica/permanencia-saida", label: "Cláusulas 12 e 13" }],
  },
  {
    termo: "Faixas mín/máx",
    def: "Limites de flexibilidade controlada para ajustar a chave O/E/G no caso concreto, com justificativa em evidências objetivas e validação do Comitê.",
    refs: [{ href: "/politica/pool-unidade", label: "Anexo VII (5-C)" }],
  },
  {
    termo: "PUBLICOS_CAPITAL",
    def: "Sócios elegíveis ao Bloco A — categoria que abrange Sócio de Capital, Sócio de Capital Gestor e Sócio de Capital Líder de Unidade.",
    refs: [{ href: "/politica/categorias-socio", label: "Categorias" }],
  },
  {
    termo: "Originação vs Execução vs Gestão",
    def: "Três tipos de contribuição quando um caso é compartilhado entre unidades. Originação = relacionamento/captação. Execução = entrega. Gestão = coordenação contínua. Cada uma tem peso na chave O/E/G.",
    refs: [{ href: "/politica/pool-unidade", label: "Anexo VII (5-A a 5-E)" }],
  },
  {
    termo: "AdS — Acordo de Sócios",
    def: "Instrumento societário formal que prevalece sobre a Política em caso de conflito perante terceiros. É a referência para valuation e apuração de haveres.",
    refs: [{ href: "/politica/permanencia-saida", label: "Cláusula 13" }],
  },
];

export default async function GlossarioPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <main className="mx-auto max-w-[1000px] px-4 sm:px-6 py-6 space-y-6">
      <PageHeader
        breadcrumb={[
          { label: "Início", href: "/simulacao" },
          { label: "Como funciona", href: "/como-funciona" },
          { label: "Glossário" },
        ]}
        title="Glossário"
        description="Termos do modelo DSF com referência cruzada para a Política."
        meta={
          <Link href="/como-funciona" className="inline-flex items-center gap-1 hover:text-peri-700">
            <ArrowLeft className="h-3 w-3" /> Voltar
          </Link>
        }
      />

      <Card className="overflow-hidden">
        <dl className="divide-y divide-neutral-100">
          {TERMOS.map((t) => (
            <div key={t.termo} className="px-5 py-4">
              <dt className="font-semibold text-navy-900">{t.termo}</dt>
              <dd className="text-sm text-neutral-700 mt-1 leading-relaxed">{t.def}</dd>
              {t.refs && t.refs.length > 0 && (
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium">
                    veja:
                  </span>
                  {t.refs.map((r) => (
                    <Link
                      key={r.href}
                      href={r.href}
                      className="text-xs text-peri-700 hover:text-peri-900 hover:underline"
                    >
                      {r.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </dl>
      </Card>
    </main>
  );
}
