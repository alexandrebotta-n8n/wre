// Templates pré-salvos de insumos para aplicação rápida em qualquer cenário.
// Cada template define um multiplicador a ser aplicado sobre o ResultadoPeriodo
// oficial (não valores absolutos — assim funciona para qualquer período).
//
// Exemplo: "Pessimista -20%" multiplica todos os LLs por 0.80.

export interface TemplateInsumos {
  id: string;
  nome: string;
  descricao: string;
  /** Multiplicador aplicado ao LL de cada unidade. 1.0 = sem mudança. */
  multiplicadorLL: number;
  /** Multiplicador opcional para fundingVariavel; se null, segue multiplicadorLL. */
  multiplicadorFunding?: number;
  cor?: "mint" | "peri" | "amber" | "red";
}

export const TEMPLATES_INSUMOS: TemplateInsumos[] = [
  {
    id: "otimista-15",
    nome: "Otimista +15%",
    descricao: "Crescimento acima do esperado em todas as unidades. LL e funding +15%.",
    multiplicadorLL: 1.15,
    cor: "mint",
  },
  {
    id: "realista",
    nome: "Realista (sem ajuste)",
    descricao: "Sem mudança — usa o ResultadoPeriodo oficial. Equivale a 'Resetar tudo'.",
    multiplicadorLL: 1.0,
    cor: "peri",
  },
  {
    id: "pessimista-15",
    nome: "Pessimista -15%",
    descricao: "Cenário conservador. LL e funding -15% em todas as unidades.",
    multiplicadorLL: 0.85,
    cor: "amber",
  },
  {
    id: "crise-30",
    nome: "Crise -30%",
    descricao: "Cenário de stress severo. LL e funding -30%, simula recessão.",
    multiplicadorLL: 0.70,
    cor: "red",
  },
];

export function getTemplate(id: string): TemplateInsumos | null {
  return TEMPLATES_INSUMOS.find((t) => t.id === id) ?? null;
}
