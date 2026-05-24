// Helper puro: redistribui quotas societárias removendo fundadores e Sócios
// de Serviços, repassando o saldo proporcionalmente entre Sócios de Capital
// remanescentes.
//
// Usado quando o cenário está em modo "REDISTRIBUIDA" — simula o que
// aconteceria se fundadores/serviços não tivessem quota de capital.
//
// Não depende de Prisma nem React — função pura, testável isoladamente.
import type { Publico } from "./tipos";

// Quem perde a quota (zera) ao redistribuir.
//   - Fundadores: tipicamente recebem só funding individual (Socio.fundingFundadorAnual).
//   - SOCIO_SERVICOS: não tem capital social típico, mesmo cadastrado com %.
// Outras categorias (SOCIO_SERVICOS_ESTRATEGICO, LIDER_UNIDADE_NON_EQUITY,
// LIDER_TECNICO) preservam quota original — usuário pode pedir extensão depois.
function deveZerar(s: { publico: Publico; isFundador: boolean }): boolean {
  return s.isFundador || s.publico === "SOCIO_SERVICOS";
}

// Quem RECEBE a redistribuição (capital remanescente).
const PUBLICOS_CAPITAL_REMANESCENTE: Publico[] = [
  "SOCIO_CAPITAL",
  "SOCIO_CAPITAL_GESTOR",
  "SOCIO_CAPITAL_LIDER_UNIDADE",
];
function ehCapitalRemanescente(s: { publico: Publico; isFundador: boolean }): boolean {
  return !s.isFundador && PUBLICOS_CAPITAL_REMANESCENTE.includes(s.publico);
}

export interface SocioParaRedistribuir {
  id: string;
  publico: Publico;
  isFundador: boolean;
  percentualQuotas: number;
}

/**
 * Calcula quota redistribuída para cada sócio. Retorna mapa id → nova quota.
 *
 * Regras:
 *   1. Fundadores e SOCIO_SERVICOS → 0.
 *   2. totalZerado = Σ quotas dos zerados.
 *   3. somaCapital = Σ quotas dos capital remanescentes (originais).
 *   4. Cada capital remanescente recebe: quotaOrig × (somaCapital + totalZerado) / somaCapital.
 *   5. Outros públicos não cobertos pelas regras 1+3 (ex: Líder Non-Equity) mantêm a quota
 *      original — não recebem redistribuição nem perdem quota.
 *   6. Edge case somaCapital=0 (sem capital remanescente): não há pra quem redistribuir;
 *      fundadores/serviços ficam zerados; soma total < 100% (aceitável — engine lida com isso).
 */
export function redistribuirQuotas(
  socios: SocioParaRedistribuir[],
): Map<string, number> {
  const result = new Map<string, number>();
  let totalZerado = 0;
  let somaCapital = 0;

  // Passada 1 — classifica e mede.
  for (const s of socios) {
    if (deveZerar(s)) {
      totalZerado += s.percentualQuotas;
    } else if (ehCapitalRemanescente(s)) {
      somaCapital += s.percentualQuotas;
    }
  }

  // Passada 2 — escreve quotas finais.
  for (const s of socios) {
    if (deveZerar(s)) {
      result.set(s.id, 0);
    } else if (ehCapitalRemanescente(s)) {
      if (somaCapital > 0) {
        // Distribui proporcional: quotaOrig × (1 + totalZerado/somaCapital).
        const fator = (somaCapital + totalZerado) / somaCapital;
        result.set(s.id, s.percentualQuotas * fator);
      } else {
        // Sem capital remanescente — mantém original (que provavelmente é 0).
        result.set(s.id, s.percentualQuotas);
      }
    } else {
      // Outros públicos: mantêm a quota original.
      result.set(s.id, s.percentualQuotas);
    }
  }

  return result;
}
