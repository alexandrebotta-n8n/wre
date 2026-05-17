// Dados das 8 etapas do cálculo (modelo NOVO + ATUAL).
// Usadas em /como-funciona/etapas e /como-funciona/etapas/[n].

export interface EtapaInfo {
  numero: number;
  slug: string;
  titulo: string;
  modelo: "AMBOS" | "NOVO" | "ATUAL";
  formula: string;
  descricao: string;
  exemploNumeros: string;
  exemploResultado: string;
  veja?: string;
}

export const ETAPAS: EtapaInfo[] = [
  {
    numero: 1,
    slug: "pro-labore",
    titulo: "Pró-labore",
    modelo: "AMBOS",
    formula: "proLaboreMensal × meses (por sócio elegível)",
    descricao:
      "Pagamento mensal fixo aplicado a 5 categorias da Política DSF v1 (Sócio de Capital, Capital Gestor, Capital Líder, Sócio de Serviços, Serviços Estratégico). Conforme matriz oficial, Líder de Unidade Non-Equity NÃO recebe pró-labore. Valor padrão configurado em proLaboreMensal na Premissa; cada sócio pode ter override individual em /socios (campo Pró-labore/mês). Sai do LL antes de chegar ao RDA.",
    exemploNumeros: "R$ 5.000 × 12 meses × 8 sócios elegíveis",
    exemploResultado: "R$ 480.000 ano",
    veja: "/politica/categorias-socio",
  },
  {
    numero: 2,
    slug: "gestao-admin",
    titulo: "Remuneração de Administração",
    modelo: "AMBOS",
    formula: "tabelaSalarial[nível][faixa] × meses",
    descricao:
      "Aplicada a 4 categorias conforme matriz oficial. Default: Capital Gestor e Sócio de Serviços. Condicionado: Capital Líder e Serviços Estratégico (só se houver cargo formal). Capital sem função executiva e Líder Non-Equity NÃO recebem. O engine usa o lookup TabelaSalário[nível][faixa] do cadastro do sócio — OU um valor mensal individual digitado em /socios (campo Gestão/mês), que sobrescreve a tabela para casos não-padrão.",
    exemploNumeros: "Nível Diretor / Faixa 3 = R$ 18.000 × 12m × 2 gestores",
    exemploResultado: "R$ 432.000 ano",
    veja: "/politica/categorias-socio",
  },
  {
    numero: 3,
    slug: "discricionario-fundadores",
    titulo: "Discricionário fundadores",
    modelo: "AMBOS",
    formula: "ClassificacaoSocio.valorDiscricionario (BRL por sócio, por cenário)",
    descricao:
      "Valor BRL fixo definido CASO A CASO no drawer Classificações de cada cenário. Aplicável apenas a sócios com isFundador=true. Deduzido do LL antes do RDA no NOVO e do funding residual no ATUAL. Quando 0/vazio, fundadores não recebem nesta etapa. Substitui o antigo valor anual global rateado por quotas.",
    exemploNumeros: "Décio R$ 130.000 + Gilberto R$ 130.000 (definidos no cenário)",
    exemploResultado: "Σ R$ 260.000 abatido do LL",
    veja: "/politica/categorias-socio",
  },
  {
    numero: 4,
    slug: "rda",
    titulo: "RDA — Resultado Distribuível Ajustado",
    modelo: "NOVO",
    formula: "LL_matriz − admin (1 + 2 + 3)",
    descricao:
      "Lucro líquido da matriz, deduzidos pró-labore, gestão e discricionário dos fundadores. É a base de cálculo dos blocos A/B/C.",
    exemploNumeros: "LL R$ 3.500.000 − admin R$ 1.272.000 − discricionário fund. R$ 200.000",
    exemploResultado: "RDA R$ 2.028.000",
    veja: "/politica/blocos",
  },
  {
    numero: 5,
    slug: "bloco-a",
    titulo: "Bloco A — Parcela Institucional (45%)",
    modelo: "NOVO",
    formula: "RDA × 45% × (quota_socio / Σ quotas_NÃO_fundadores)",
    descricao:
      "Distribuição proporcional às quotas, apenas para Sócios de Capital NÃO-fundadores. Fundadores recebem o valor discricionário em etapa separada (abatido do LL antes do RDA) e ficam fora do Bloco A.",
    exemploNumeros: "RDA R$ 2,028M × 45% / 70 quotas (sem fundadores) × 12 quotas (sócio X)",
    exemploResultado: "Sócio X: R$ 156.420",
    veja: "/politica/blocos",
  },
  {
    numero: 6,
    slug: "bloco-b",
    titulo: "Bloco B — Parcela de Performance (35%)",
    modelo: "NOVO",
    formula: "RDA × 35%, distribuído conforme modo escolhido",
    descricao:
      "4 modos: UNIFORME (igual entre elegíveis), PESO_INDIVIDUAL, ORIGINACAO ou POR_AREA (mix orgânico/incremental por área). Conforme matriz oficial, aplica a 5 categorias: Sócios de Capital (3 variantes), Sócio de Serviços e Sócio de Serviços Estratégico. Líder Non-Equity NÃO recebe Bloco B (recebe pool de unidade + créditos).",
    exemploNumeros: "RDA R$ 2,228M × 35% = R$ 779.800 distribuído por POR_AREA",
    exemploResultado: "Sócio Cível com peso 0.20: R$ 64.600",
    veja: "/politica/pesos-perfil-area",
  },
  {
    numero: 7,
    slug: "bloco-c",
    titulo: "Bloco C — Parcela Estratégica (20%)",
    modelo: "NOVO",
    formula: "RDA × 20% (retido na matriz)",
    descricao:
      "Reserva estratégica para expansão, retenção, sucessão e projetos especiais. Não distribuído automaticamente — decisão discricionária do Comitê.",
    exemploNumeros: "RDA R$ 2,228M × 20%",
    exemploResultado: "R$ 445.600 retidos",
    veja: "/politica/expansao",
  },
  {
    numero: 8,
    slug: "comissao-originacao",
    titulo: "Comissão de Originação (individual)",
    modelo: "NOVO",
    formula: "originacaoAnualSocio × taxaComissaoOriginacao",
    descricao:
      "Componente individual: cada sócio recebe um percentual sobre a receita que originou. O valor anual de originação por sócio é cadastrado no painel 'Originação por sócio' (topo da /simulacao), e a taxa de comissão é configurada na Premissa NOVA (taxaComissaoOriginacao). Como é variável global, afeta todos os cenários DRAFT do ano.",
    exemploNumeros: "Sócio X originou R$ 800.000 × 5% taxa",
    exemploResultado: "Comissão R$ 40.000 ano",
    veja: "/politica/categorias-socio",
  },
  {
    numero: 9,
    slug: "pool-unidade",
    titulo: "Pool de unidade (quando há líder)",
    modelo: "AMBOS",
    formula: "LL_unidade × { 50% Sociedade · 30% Líder · 20% Equipe/Reserva }",
    descricao:
      "Aplicado SOBRE o resultado local de cada unidade não-matriz. Os 50% que voltam para a Sociedade alimentam o LL Matriz e entram no RDA. O líder é definido pelo campo 'Unidade liderada' no cadastro do Sócio (/socios) ou herdado para a ClassificacaoSocio do cenário.",
    exemploNumeros: "Unidade Sul LL R$ 1.200.000",
    exemploResultado: "R$ 600k Soc · R$ 360k Líder · R$ 240k Equipe",
    veja: "/politica/pool-unidade",
  },
];

export function getEtapa(slugOrNum: string): EtapaInfo | null {
  return (
    ETAPAS.find((e) => e.slug === slugOrNum || String(e.numero) === slugOrNum) ?? null
  );
}
