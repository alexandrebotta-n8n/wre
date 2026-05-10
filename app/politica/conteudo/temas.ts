// Metadata dos 12 temas navegáveis da Política DSF.
// Fonte da verdade para o hub, a rota dinâmica /politica/[tema] e a busca.

export type TemaSlug =
  | "principios"
  | "categorias-socio"
  | "progressao-vesting"
  | "lideres-unidade"
  | "ingresso-lateral"
  | "governanca"
  | "blocos"
  | "pool-unidade"
  | "pesos-perfil-area"
  | "permanencia-saida"
  | "expansao"
  | "disposicoes-finais";

export type TemaGrupo = "fundamentos" | "trilha" | "modelo-economico" | "ciclo-vida";

export type IconeKey =
  | "compass" // princípios
  | "users" // categorias
  | "trending-up" // progressão
  | "map-pin" // líderes unidade
  | "user-plus" // lateral
  | "landmark" // governança
  | "layers" // blocos
  | "pie-chart" // pool
  | "scale" // pesos
  | "log-out" // permanência/saída
  | "globe" // expansão
  | "check-circle"; // finais

export type VisualKey =
  | "cards-principios"
  | "matriz-categorias"
  | "timeline-vesting"
  | "diagrama-unidade"
  | "funil-lateral"
  | "org-chart-governanca"
  | "waterfall-blocos"
  | "donut-pool"
  | "matriz-pesos"
  | "tabela-saida"
  | "mapa-expansao"
  | "cards-finais";

export interface ParamsSimulacao {
  /** Hint textual no link para Simulação. */
  hint?: string;
  /** Slug do que destacar (ex: drilldown sócio específico) — atual /simulacao não consome ainda; reservamos pra evolução. */
  destaque?: string;
}

export interface TemaPolitica {
  slug: TemaSlug;
  titulo: string;
  resumoCurto: string;
  resumoExecutivo: string[];
  grupo: TemaGrupo;
  icone: IconeKey;
  /** Marcadores das cláusulas a extrair de POLITICA_MD. */
  clausulas: string[];
  /** Marcadores dos anexos integrados (opcional). */
  anexos: string[];
  /** Rótulo curto exibido como "badge" da cláusula original. */
  refLabel: string;
  visual: VisualKey;
  exemplo: {
    titulo: string;
    descricao: string;
    paramsSimulacao?: ParamsSimulacao;
  };
  vejaTambem: TemaSlug[];
}

export const GRUPOS: Record<TemaGrupo, { titulo: string; descricao: string }> = {
  fundamentos: {
    titulo: "Fundamentos",
    descricao: "Princípios, categorias de sócio e governança do partnership.",
  },
  trilha: {
    titulo: "Trilha societária",
    descricao: "Como se entra, evolui e se assume liderança no sistema DSF.",
  },
  "modelo-economico": {
    titulo: "Modelo econômico",
    descricao: "Como o resultado é dividido entre sócios, unidades e áreas.",
  },
  "ciclo-vida": {
    titulo: "Ciclo de vida",
    descricao: "Permanência, saída, expansão e disposições estruturais.",
  },
};

export const TEMAS: TemaPolitica[] = [
  // ─────────────────────────────────────────────────────────── FUNDAMENTOS
  {
    slug: "principios",
    titulo: "Princípios",
    resumoCurto: "Os 7 princípios estruturantes do sistema de partnership.",
    resumoExecutivo: [
      "O sistema de partnership da DSF observa cumulativamente 7 princípios estruturantes: institucionalidade, meritocracia com responsabilidade, perenidade, alinhamento entre sócios e estratégia, discricionariedade técnica e política dos órgãos competentes, proteção do núcleo institucional do equity e valorização da marca, cultura e plataforma DSF.",
      "Esses princípios funcionam como filtros decisórios: toda regra operacional, deliberação de comitê ou ajuste no modelo econômico deve poder ser justificado por ao menos um deles.",
      "O partnership é tratado como instrumento — de retenção de talentos, de profissionalização e de fortalecimento da plataforma multiunidades — e não como fim em si.",
    ],
    grupo: "fundamentos",
    icone: "compass",
    clausulas: ["CLÁUSULA SEGUNDA"],
    anexos: [],
    refLabel: "Cláusula 2",
    visual: "cards-principios",
    exemplo: {
      titulo: "Aplicação prática",
      descricao:
        "Diante de uma proposta de promover um sócio sênior ao Equity sem critérios objetivos atendidos, o Comitê pode invocar 'meritocracia com responsabilidade' e 'proteção do núcleo institucional' para condicionar a progressão a um vesting estendido.",
    },
    vejaTambem: ["categorias-socio", "governanca", "permanencia-saida"],
  },
  {
    slug: "categorias-socio",
    titulo: "Categorias de sócio",
    resumoCurto: "Sócios de Capital, Sócios de Serviços e classes intermediárias.",
    resumoExecutivo: [
      "A estrutura societária é organizada em 6 categorias: Sócio de Capital, Sócio de Capital Gestor, Sócio de Capital Líder de Unidade, Sócio de Serviços, Sócio de Serviços Estratégico e Líder de Unidade Non-Equity.",
      "Cada categoria tem combinação distinta de mecanismos econômicos. A matriz vinculante define para cada par (mecanismo, categoria) o status Default (aplica automaticamente), Não aplicável, Excepcional (decisão do Comitê), Condicionado (cargo formal) ou Cumulativo (soma sempre).",
      "Resumindo: Bloco A só vai para as 3 variantes de Capital; Pró-labore e Bloco B vão para todas exceto Líder Non-Equity; Pool 30% vai apenas para os 2 tipos de líder de unidade; Rem. de Administração tem 4 elegíveis (2 Default + 2 Condicionados); Bloco C é Excepcional para todas; Créditos de Originação/Execução/Gestão são Cumulativos para todas.",
    ],
    grupo: "fundamentos",
    icone: "users",
    clausulas: ["CLÁUSULA TERCEIRA", "CLÁUSULA QUARTA"],
    anexos: ["ANEXO III"],
    refLabel: "Cláusulas 3 e 4 + Anexo III",
    visual: "matriz-categorias",
    exemplo: {
      titulo: "Como classificar um sócio novo",
      descricao:
        "Maria, advogada sênior promovida internamente, ingressa como Sócia de Serviços. Ela recebe pró-labore + participação no Bloco B (35%), mas não no Bloco A (45%) nem em haveres — até que eventualmente progrida ao Equity.",
      paramsSimulacao: { hint: "Compare modelos ATUAL vs NOVO para ver impacto por categoria." },
    },
    vejaTambem: ["progressao-vesting", "blocos", "pesos-perfil-area"],
  },
  {
    slug: "governanca",
    titulo: "Governança e Comitês",
    resumoCurto: "3 comitês deliberam sobre partnership, remuneração e promoções.",
    resumoExecutivo: [
      "A governança do partnership é exercida por 3 comitês: Comitê de Partnership (ingresso, progressão, permanência, desligamento), Comitê de Remuneração e Economics (critérios de distribuição, pesos, parâmetros de alocação) e Comitê de Promoções e Avaliação (parecer técnico, acompanhamento da trilha societária).",
      "Cada comitê tem composição preferencialmente formada por Sócios de Capital, mandato de 2 anos com recondução permitida e regras de quórum/conflito de interesse próprias.",
      "Todas as deliberações são registradas em ata, com pauta, presentes e conclusão — preservando memória institucional e auditabilidade das decisões.",
    ],
    grupo: "fundamentos",
    icone: "landmark",
    clausulas: ["CLÁUSULA OITAVA"],
    anexos: ["ANEXO I"],
    refLabel: "Cláusula 8 + Anexo I",
    visual: "org-chart-governanca",
    exemplo: {
      titulo: "Fluxo de uma promoção ao Equity",
      descricao:
        "Indicação chega ao Comitê de Promoções → parecer técnico → Comitê de Remuneração avalia impacto econômico → Comitê de Partnership delibera ingresso → registro em ata.",
    },
    vejaTambem: ["progressao-vesting", "categorias-socio", "permanencia-saida"],
  },

  // ─────────────────────────────────────────────────────────── TRILHA
  {
    slug: "progressao-vesting",
    titulo: "Progressão e Vesting",
    resumoCurto: "Como Sócios de Serviços progridem ao Equity e como o vesting funciona.",
    resumoExecutivo: [
      "A progressão ao Equity considera contribuição para geração de valor, capacidade de liderança e retenção de talentos, visão empresarial e compromisso de longo prazo, alinhamento com a expansão e perenidade, e integração efetiva ao modelo central.",
      "O ingresso pode ser imediato ou progressivo via vesting — aquisição/integralização gradual de participação condicionada à permanência e ao atingimento continuado de metas. Quotas não consolidadas podem ser revertidas em caso de desligamento.",
      "Após o ingresso inicial no Equity, pode haver período probatório com regras de recompra ou limitação de direitos econômicos.",
    ],
    grupo: "trilha",
    icone: "trending-up",
    clausulas: ["CLÁUSULA QUINTA"],
    anexos: ["ANEXO IV"],
    refLabel: "Cláusula 5 + Anexo IV",
    visual: "timeline-vesting",
    exemplo: {
      titulo: "Vesting de 4 anos com cliff de 1 ano",
      descricao:
        "João ingressa como Sócio de Capital em vesting. Durante o 1º ano (cliff), nenhuma quota é consolidada. A partir do 2º ano, 25% por ano. Se sair antes do 4º ano, perde a parcela ainda não consolidada.",
    },
    vejaTambem: ["categorias-socio", "ingresso-lateral", "permanencia-saida"],
  },
  {
    slug: "lideres-unidade",
    titulo: "Líderes de unidade",
    resumoCurto: "Tratamento societário e econômico dos líderes de unidades estratégicas.",
    resumoExecutivo: [
      "Líderes de unidade podem ser enquadrados como Sócio de Serviços, Sócio de Serviços Estratégico, Sócio de Capital em regime progressivo ou — em hipótese excepcional — Sócio de Capital pleno.",
      "Liderar unidade não confere automaticamente participação no equity central. O líder participa do pool econômico da unidade (30% do LL local) e/ou do sistema central, conforme seu status societário.",
      "Avaliação considera implantação e consolidação da unidade, crescimento de receita e margem, retenção de clientes, formação de equipe local, integração com marca/cultura DSF e contribuição para o crescimento do grupo.",
    ],
    grupo: "trilha",
    icone: "map-pin",
    clausulas: ["CLÁUSULA SEXTA"],
    anexos: ["ANEXO V"],
    refLabel: "Cláusula 6 + Anexo V",
    visual: "diagrama-unidade",
    exemplo: {
      titulo: "Pool de unidade aplicado",
      descricao:
        "Unidade Sul fecha o ano com LL_local de R$ 1,2M. Pool: R$ 600k voltam para a Sociedade (50%), R$ 360k para o Líder (30%), R$ 240k para equipe/reserva (20%).",
      paramsSimulacao: { hint: "Use o painel de parâmetros para ajustar a divisão 50/30/20." },
    },
    vejaTambem: ["pool-unidade", "blocos", "expansao"],
  },
  {
    slug: "ingresso-lateral",
    titulo: "Ingresso lateral",
    resumoCurto: "Profissionais externos com carteira ou expertise estratégica.",
    resumoExecutivo: [
      "Ingresso lateral é o canal para incorporar profissionais externos com potencial relevante de expansão geográfica, aquisição de carteira, fortalecimento técnico ou consolidação institucional.",
      "Pode ocorrer como Sócio de Serviços, Sócio de Serviços Estratégico, Sócio elegível a progressão futura ou — excepcionalmente — Sócio de Capital. Não gera direito automático ao equity.",
      "Avaliação considera qualidade e potencial de retenção da carteira, reputação técnica, aderência cultural, integração com a plataforma e compatibilidade econômica. Período de integração com metas e revisões periódicas é regra.",
    ],
    grupo: "trilha",
    icone: "user-plus",
    clausulas: ["CLÁUSULA SÉTIMA"],
    anexos: ["ANEXO VI"],
    refLabel: "Cláusula 7 + Anexo VI",
    visual: "funil-lateral",
    exemplo: {
      titulo: "Lateral com carteira",
      descricao:
        "Carlos chega como lateral trazendo carteira de R$ 800k anuais. Ingressa como Sócio de Serviços Estratégico com metas de retenção de 80% da carteira ao final de 18 meses. Só então é avaliado para progressão ao Equity.",
    },
    vejaTambem: ["progressao-vesting", "categorias-socio", "expansao"],
  },

  // ─────────────────────────────────────────────────────── MODELO ECONÔMICO
  {
    slug: "blocos",
    titulo: "Blocos A · B · C",
    resumoCurto: "Como o RDA é dividido entre Institucional (45%), Performance (35%) e Estratégica (20%).",
    resumoExecutivo: [
      "O Resultado Distribuível Ajustado (RDA) é o LL Matriz menos provisões, reservas e ajustes definidos pela governança. É a base sobre a qual se aplica a regra dos 3 blocos.",
      "Bloco A (45%) — Parcela Institucional, exclusiva dos Sócios de Capital, distribuída proporcionalmente às quotas. Remunera o risco do equity e a participação no núcleo permanente.",
      "Bloco B (35%) — Parcela de Performance, pode contemplar Sócios de Capital e de Serviços conforme avaliação. Distribuído por modo configurável: UNIFORME, PESO_INDIVIDUAL, ORIGINAÇÃO ou POR_AREA.",
      "Bloco C (20%) — Parcela Estratégica e de Longo Prazo, retida na matriz para expansão, retenção, sucessão, inovação e proteção institucional. Não distribui automaticamente.",
    ],
    grupo: "modelo-economico",
    icone: "layers",
    clausulas: ["CLÁUSULA NONA"],
    anexos: ["ANEXO VII"],
    refLabel: "Cláusula 9 + Anexo VII",
    visual: "waterfall-blocos",
    exemplo: {
      titulo: "RDA de R$ 2,5M",
      descricao:
        "Após admin, RDA = R$ 2,5M. Bloco A = R$ 1,125M (45%) entre 6 sócios de capital. Bloco B = R$ 875k (35%) entre 9 elegíveis. Bloco C = R$ 500k (20%) retidos para expansão.",
      paramsSimulacao: { hint: "Veja como os percentuais alteram cada pacote em /simulacao." },
    },
    vejaTambem: ["pool-unidade", "pesos-perfil-area", "categorias-socio"],
  },
  {
    slug: "pool-unidade",
    titulo: "Pool de unidade",
    resumoCurto: "Como o LL de cada unidade é dividido (50/30/20) e como casos interunidades são tratados.",
    resumoExecutivo: [
      "Cada unidade não-matriz pode ter um pool próprio sobre o LL local: 50% volta para a Sociedade (institucional), 30% para o Líder de Unidade e 20% para equipe/reserva local.",
      "Quando um serviço é originado em uma unidade e executado em outra, aplica-se a chave-padrão: Originação 30% / Execução 60% / Gestão 10%. Faixas de ajuste autorizadas: O 20-40%, E 50-70%, G 0-15%.",
      "A vedação de dupla contagem é absoluta: o mesmo resultado econômico não pode formar base de pool em duas unidades simultaneamente.",
      "Persistindo divergência entre unidades, a decisão é do Comitê de Remuneração e Economics.",
    ],
    grupo: "modelo-economico",
    icone: "pie-chart",
    clausulas: ["CLÁUSULA DÉCIMA"],
    anexos: ["ANEXO VII"],
    refLabel: "Cláusula 10 + Anexo VII",
    visual: "donut-pool",
    exemplo: {
      titulo: "Caso interunidades",
      descricao:
        "Cliente captado pela unidade Sul (originação) e executado pela matriz (execução). Resultado: R$ 200k. Aplicação da chave: R$ 60k para Sul, R$ 120k para matriz, R$ 20k para gestão (matriz, que coordena).",
    },
    vejaTambem: ["lideres-unidade", "blocos", "expansao"],
  },
  {
    slug: "pesos-perfil-area",
    titulo: "Pesos por perfil e área",
    resumoCurto: "Pesos diferenciados por perfil funcional, fase da unidade e área de prática.",
    resumoExecutivo: [
      "Critérios de avaliação podem ter pesos distintos conforme perfil do avaliado, unidade vinculada, estágio da operação e objetivos estratégicos do exercício.",
      "Em unidades novas, remotas ou estratégicas: peso ampliado para implantação, crescimento de carteira, geração de receita local, consolidação de equipe e integração à plataforma.",
      "Em operações maduras: peso ampliado para rentabilidade recorrente, retenção de clientes, institucionalidade, sucessão e colaboração interunidades.",
      "A matriz de pesos por perfil e geografia é definida em política operacional aprovada pela governança.",
    ],
    grupo: "modelo-economico",
    icone: "scale",
    clausulas: ["CLÁUSULA DÉCIMA PRIMEIRA"],
    anexos: [],
    refLabel: "Cláusula 11",
    visual: "matriz-pesos",
    exemplo: {
      titulo: "Bloco B distribuído por área",
      descricao:
        "No modo POR_AREA, sócios da prática Cível recebem peso 0.30 (orgânico) e 0.20 (incremental). Os da Trabalhista, 0.20 e 0.30. Mix orgânico/incremental: 76/24.",
      paramsSimulacao: { hint: "Mude para POR_AREA no painel de parâmetros e ajuste os pesos." },
    },
    vejaTambem: ["blocos", "lideres-unidade", "categorias-socio"],
  },

  // ─────────────────────────────────────────────────────────── CICLO DE VIDA
  {
    slug: "permanencia-saida",
    titulo: "Permanência e saída",
    resumoCurto: "Reclassificação, diluição, saída amigável, bad leaver, valuation e haveres.",
    resumoExecutivo: [
      "Permanência depende do cumprimento continuado de deveres de desempenho, lealdade, alinhamento institucional, conduta e colaboração.",
      "A Sociedade pode prever reclassificação entre regimes, suspensão de progressão, reversão de quotas não consolidadas, recompra e diluição em hipóteses justificadas.",
      "Saídas (amigável, volitiva, bad leaver, aposentadoria, morte, invalidez) seguem o Acordo de Sócios e os anexos societários específicos. O critério de valuation prevalecerá sempre o do Acordo de Sócios vigente.",
      "Sócios de Serviços não têm direito a haveres societários, salvo previsão expressa em instrumento societário formal.",
    ],
    grupo: "ciclo-vida",
    icone: "log-out",
    clausulas: ["CLÁUSULA DÉCIMA SEGUNDA", "CLÁUSULA DÉCIMA TERCEIRA"],
    anexos: [],
    refLabel: "Cláusulas 12 e 13",
    visual: "tabela-saida",
    exemplo: {
      titulo: "Bad leaver vs good leaver",
      descricao:
        "Pedro sai por descumprimento grave (bad leaver): perde quotas em vesting, recompra ao valor de patrimônio líquido. Ana se aposenta após 20 anos (good leaver): valuation pelo critério do Acordo de Sócios vigente.",
    },
    vejaTambem: ["progressao-vesting", "categorias-socio", "governanca"],
  },
  {
    slug: "expansao",
    titulo: "Expansão e M&A",
    resumoCurto: "Crescimento geográfico, novas unidades e operações de fusão.",
    resumoExecutivo: [
      "A expansão geográfica está vinculada ao sistema de partnership e à valorização do negócio como plataforma multiunidades.",
      "Cada nova unidade pode gerar resultado próprio e fortalecer a plataforma central via compartilhamento de resultados, reforço de marca, sinergias comerciais e ampliação da atratividade para talentos, clientes e potenciais combinações.",
      "A Política serve de base para side letters, políticas de unidade, acordos específicos de expansão e instrumentos de integração de laterais estratégicos.",
    ],
    grupo: "ciclo-vida",
    icone: "globe",
    clausulas: ["CLÁUSULA DÉCIMA QUARTA"],
    anexos: [],
    refLabel: "Cláusula 14",
    visual: "mapa-expansao",
    exemplo: {
      titulo: "Nova unidade em SP",
      descricao:
        "Plano de expansão para SP via lateral estratégico (Cláusula 7) + designação de líder (Cláusula 6). Pool de unidade ajustado para fase de implantação (Cláusula 10.4).",
    },
    vejaTambem: ["lideres-unidade", "ingresso-lateral", "pool-unidade"],
  },
  {
    slug: "disposicoes-finais",
    titulo: "Disposições finais",
    resumoCurto: "Vigência, revisão, confidencialidade e disposições gerais.",
    resumoExecutivo: [
      "A Política entra em vigor na assinatura e permanece válida por prazo indeterminado, até substituição, revisão ou incorporação ao Acordo de Sócios.",
      "Revisão formal recomendada periodicamente ou sempre que houver alteração material da estratégia, do quadro societário, da geografia ou do modelo econômico.",
      "Confidencialidade absoluta sobre informações, dados, deliberações e materiais — obrigação que perdura por 5 anos após o término. Não afasta o sigilo profissional advocatício.",
      "Invalidade parcial não prejudica as demais disposições. Assinaturas físicas ou eletrônicas são válidas.",
    ],
    grupo: "ciclo-vida",
    icone: "check-circle",
    clausulas: ["CLÁUSULA DÉCIMA SEXTA", "CLÁUSULA DÉCIMA SÉTIMA"],
    anexos: [],
    refLabel: "Cláusulas 16 e 17",
    visual: "cards-finais",
    exemplo: {
      titulo: "Revisão periódica",
      descricao:
        "A cada 2 anos, o Comitê de Partnership revisa a Política. Em 2026, prevista uma revisão para incorporar novos parâmetros do Bloco B e ajustes do pool de unidade após avaliação do 1º ciclo.",
    },
    vejaTambem: ["governanca", "permanencia-saida", "categorias-socio"],
  },
];

export function getTema(slug: string): TemaPolitica | null {
  return TEMAS.find((t) => t.slug === slug) ?? null;
}

export function temasPorGrupo(): Record<TemaGrupo, TemaPolitica[]> {
  const out: Record<TemaGrupo, TemaPolitica[]> = {
    fundamentos: [],
    trilha: [],
    "modelo-economico": [],
    "ciclo-vida": [],
  };
  for (const t of TEMAS) out[t.grupo].push(t);
  return out;
}
