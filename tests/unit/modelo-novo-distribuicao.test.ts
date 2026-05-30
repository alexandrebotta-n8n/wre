// Engine NOVO — distribuição do Bloco B (regra única: nº salários × base)
// e regra dos fundadores (recebem 0 no NOVO; Bloco A vai pros não-fundadores).
//
// Antes: testava 5 modos configuráveis (UNIFORME/PESO_INDIVIDUAL/
// ORIGINACAO/POR_AREA/ALVO_NUM_SALARIOS). Foram removidos da Premissa —
// hoje só existe a regra ALVO_NUM_SALARIOS. Testes específicos do alvo
// estão em `bloco-b-alvo-num-salarios.test.ts`.
import { describe, it, expect } from "vitest";
import { calcularModeloNovo } from "@/lib/domain/dsf/modelo-novo";
import type { TabelaSalarial, SocioInput, ResultadoUnidade } from "@/lib/domain/dsf";

const tabela: TabelaSalarial = {
  A: { INICIAL: 9600, PLENO: 12000, EXPERT: 14400 },
  B: { INICIAL: 8000, PLENO: 10000, EXPERT: 12000 },
  C: { INICIAL: 6400, PLENO: 8000, EXPERT: 9600 },
  D: { INICIAL: 5600, PLENO: 7000, EXPERT: 8400 },
};

const baseResultados: ResultadoUnidade[] = [
  { unidadeCodigo: "DSF", isMatriz: true, lucroLiquido: 1000000 },
];

const basePremissas = {
  percentualBlocoA: 0.45, percentualBlocoB: 0.35, percentualBlocoC: 0.20,
  poolSociedade: 0.50, poolLider: 0.30, poolEquipeReserva: 0.20,
  chaveOriginacao: 0.30, chaveExecucao: 0.60, chaveGestaoCP: 0.10,
  faixaOrigMin: 0.20, faixaOrigMax: 0.40,
  faixaExecMin: 0.50, faixaExecMax: 0.70,
  faixaGestaoMin: 0.00, faixaGestaoMax: 0.15,
  tabelaSalarial: tabela,
};

const periodo = { rotulo: "1T2026", tipo: "TRIMESTRE" as const, meses: 3 };

// ============================================================================
// Regra: Fundadores recebem valor discricionário (BRL por sócio) abatido do LL
// antes do RDA; Bloco A é distribuído apenas entre não-fundadores.
// (Garantia que o comportamento se manteve após a remoção da config de modos.)
// ============================================================================
describe("Modelo NOVO — discricionário fundador + Bloco A sem fundadores", () => {
  // 1 fundador (s1) + 2 não-fundadores capital (s2, s3).
  const sociosComFundador: SocioInput[] = [
    { id: "s1", nome: "Fundador", cargo: "Fundador", publico: "SOCIO_CAPITAL",
      percentualQuotas: 0.40, originacaoEsperadaAnual: 0, isFundador: true },
    { id: "s2", nome: "Capital Maior", cargo: "Sócio", publico: "SOCIO_CAPITAL",
      percentualQuotas: 0.20, originacaoEsperadaAnual: 0, isFundador: false },
    { id: "s3", nome: "Capital Menor", cargo: "Sócio", publico: "SOCIO_CAPITAL",
      percentualQuotas: 0.10, originacaoEsperadaAnual: 0, isFundador: false },
  ];

  it("fundador no NOVO recebe ZERO (engine ignora fundingFundadorAnual); Bloco A vai pros não-fund", () => {
    // Mudança intencional (Política DSF v1 - de/para planilha):
    // Engine NOVO ignora fundingFundadorAnual. Campo só vale pra engine ATUAL.
    // RDA = LL = 1.000.000 (sem desconto de fundador).
    // Bloco A = 450.000 distribuído entre s2 + s3 (soma quotas não-fund = 0.30).
    const V = 100_000;
    const sociosV = sociosComFundador.map((s) =>
      s.id === "s1" ? { ...s, fundingFundadorAnual: V } : s,
    );
    const r = calcularModeloNovo({
      periodo, socios: sociosV, resultados: baseResultados,
      premissas: basePremissas,
    });
    const fund = r.pacotes.find((p) => p.socioId === "s1")!;
    const s2 = r.pacotes.find((p) => p.socioId === "s2")!;
    const s3 = r.pacotes.find((p) => p.socioId === "s3")!;
    expect(fund.remuneracaoFundador).toBe(0);
    expect(fund.blocoA).toBe(0);
    expect(s2.blocoA).toBeCloseTo(300_000, 1); // 450k × 0.20/0.30
    expect(s3.blocoA).toBeCloseTo(150_000, 1); // 450k × 0.10/0.30
    expect(s2.blocoA + s3.blocoA).toBeCloseTo(450_000, 1);
    // Trace do fundador NÃO contém a etapa de remuneração de fundador.
    expect(fund.trace.find((t) => t.etapa === "3.fundador")).toBeUndefined();
  });

  it("sem discricionário (V=0), fundador continua fora do Bloco A (mudança intencional)", () => {
    const r = calcularModeloNovo({
      periodo, socios: sociosComFundador, resultados: baseResultados,
      premissas: basePremissas,
    });
    const fund = r.pacotes.find((p) => p.socioId === "s1")!;
    const s2 = r.pacotes.find((p) => p.socioId === "s2")!;
    const s3 = r.pacotes.find((p) => p.socioId === "s3")!;
    expect(fund.remuneracaoFundador).toBe(0);
    expect(fund.blocoA).toBe(0);
    expect(s2.blocoA).toBeCloseTo(300_000, 1);
    expect(s3.blocoA).toBeCloseTo(150_000, 1);
  });

  it("fundadores não aparecem na base de quotas do Bloco A", () => {
    // 2 fundadores + 1 não-fundador. Não-fundador absorve 100% do Bloco A.
    const socios2: SocioInput[] = [
      { id: "f1", nome: "Fund 1", cargo: "Fundador", publico: "SOCIO_CAPITAL",
        percentualQuotas: 0.50, originacaoEsperadaAnual: 0, isFundador: true },
      { id: "f2", nome: "Fund 2", cargo: "Fundador", publico: "SOCIO_CAPITAL",
        percentualQuotas: 0.30, originacaoEsperadaAnual: 0, isFundador: true },
      { id: "n1", nome: "Não-fund", cargo: "Sócio", publico: "SOCIO_CAPITAL",
        percentualQuotas: 0.20, originacaoEsperadaAnual: 0, isFundador: false },
    ];
    const r = calcularModeloNovo({
      periodo, socios: socios2, resultados: baseResultados,
      premissas: basePremissas,
    });
    const n1 = r.pacotes.find((p) => p.socioId === "n1")!;
    // Bloco A = 1.000.000 × 0.45 = 450.000; n1 sozinho na base → recebe tudo.
    expect(n1.blocoA).toBeCloseTo(450_000, 1);
  });
});

// ============================================================================
// Regra: sócios sem alvo de Bloco B (blocoBNumSalariosAlvo null/0) ficam
// fora do rateio e recebem R$ 0 — decisão do user na remoção dos modos.
// ============================================================================
describe("Modelo NOVO — Bloco B sem alvo", () => {
  it("sócios sem blocoBNumSalariosAlvo recebem 0 e total distribuído fica < 35% do RDA", () => {
    const socios: SocioInput[] = [
      { id: "s1", nome: "Sem alvo 1", cargo: "Sócio", publico: "SOCIO_CAPITAL",
        percentualQuotas: 0.30, originacaoEsperadaAnual: 0, isFundador: false },
      { id: "s2", nome: "Sem alvo 2", cargo: "Sócio", publico: "SOCIO_SERVICOS",
        percentualQuotas: 0, originacaoEsperadaAnual: 0, isFundador: false },
    ];
    const r = calcularModeloNovo({
      periodo, socios, resultados: baseResultados, premissas: basePremissas,
    });
    const totalB = r.pacotes.reduce((acc, p) => acc + p.blocoB, 0);
    expect(totalB).toBe(0);
    // Reserva central absorve o Bloco C (todo retido).
    expect(r.totalReservaCentral).toBeCloseTo(1_000_000 * 0.20, 1);
  });
});
