// Testa os 3 modos de distribuição do Bloco B no engine NOVO.
import { describe, it, expect } from "vitest";
import { calcularModeloNovo } from "@/lib/domain/dsf/modelo-novo";
import type { TabelaSalarial, SocioInput, ResultadoUnidade } from "@/lib/domain/dsf";

const tabela: TabelaSalarial = {
  A: { INICIAL: 9600, PLENO: 12000, EXPERT: 14400 },
  B: { INICIAL: 8000, PLENO: 10000, EXPERT: 12000 },
  C: { INICIAL: 6400, PLENO: 8000, EXPERT: 9600 },
  D: { INICIAL: 5600, PLENO: 7000, EXPERT: 8400 },
};

const baseSocios: SocioInput[] = [
  { id: "s1", nome: "Sócio Alto", cargo: "Sócio", publico: "SOCIO_CAPITAL",
    percentualQuotas: 0.30, originacaoEsperadaAnual: 800000, pesoBlocoB: 3, isFundador: false },
  { id: "s2", nome: "Sócio Médio", cargo: "Sócio", publico: "SOCIO_CAPITAL",
    percentualQuotas: 0.20, originacaoEsperadaAnual: 200000, pesoBlocoB: 2, isFundador: false },
  { id: "s3", nome: "Sócio Baixo", cargo: "Sócio", publico: "SOCIO_CAPITAL",
    percentualQuotas: 0.10, originacaoEsperadaAnual: 0, pesoBlocoB: 1, isFundador: false },
];

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
  proRataMinMeses: 3,
  tabelaSalarial: tabela,
};

const periodo = { rotulo: "1T2026", tipo: "TRIMESTRE" as const, meses: 3 };

describe("Modelo NOVO — distribuição do Bloco B", () => {
  it("UNIFORME: cada elegível recebe partes iguais", () => {
    const r = calcularModeloNovo({
      periodo, socios: baseSocios, resultados: baseResultados,
      premissas: { ...basePremissas, distribuicaoBlocoB: "UNIFORME" },
    });
    // Bloco B total = 1.000.000 × 0.35 = 350.000; 3 elegíveis → 116.666,67 cada
    const blocosB = r.pacotes.map((p) => p.blocoB);
    expect(blocosB[0]).toBeCloseTo(116666.67, 1);
    expect(blocosB[1]).toBeCloseTo(116666.67, 1);
    expect(blocosB[2]).toBeCloseTo(116666.67, 1);
  });

  it("PESO_INDIVIDUAL: proporcional ao pesoBlocoB de cada sócio", () => {
    const r = calcularModeloNovo({
      periodo, socios: baseSocios, resultados: baseResultados,
      premissas: { ...basePremissas, distribuicaoBlocoB: "PESO_INDIVIDUAL" },
    });
    // Pesos 3+2+1=6, total 350k → 175k / 116.666,67 / 58.333,33
    expect(r.pacotes[0].blocoB).toBeCloseTo(350000 * 3/6, 1);
    expect(r.pacotes[1].blocoB).toBeCloseTo(350000 * 2/6, 1);
    expect(r.pacotes[2].blocoB).toBeCloseTo(350000 * 1/6, 1);
  });

  it("ORIGINACAO: proporcional à originação esperada", () => {
    const r = calcularModeloNovo({
      periodo, socios: baseSocios, resultados: baseResultados,
      premissas: { ...basePremissas, distribuicaoBlocoB: "ORIGINACAO" },
    });
    // Originações 800k + 200k + 0 = 1.000k. s1: 280k, s2: 70k, s3: 0
    expect(r.pacotes[0].blocoB).toBeCloseTo(350000 * 0.8, 1);
    expect(r.pacotes[1].blocoB).toBeCloseTo(350000 * 0.2, 1);
    expect(r.pacotes[2].blocoB).toBe(0);
  });

  it("UNIFORME default quando distribuicaoBlocoB não definida", () => {
    const r = calcularModeloNovo({
      periodo, socios: baseSocios, resultados: baseResultados,
      premissas: basePremissas, // sem distribuicaoBlocoB
    });
    expect(r.pacotes[0].blocoB).toBeCloseTo(116666.67, 1);
  });

  it("Total Bloco B distribuído = 35% do RDA, em qualquer modo", () => {
    for (const modo of ["UNIFORME", "PESO_INDIVIDUAL", "ORIGINACAO"] as const) {
      const r = calcularModeloNovo({
        periodo, socios: baseSocios, resultados: baseResultados,
        premissas: { ...basePremissas, distribuicaoBlocoB: modo },
      });
      const totalB = r.pacotes.reduce((acc, p) => acc + p.blocoB, 0);
      expect(totalB).toBeCloseTo(350000, 1);
    }
  });
});

describe("Modelo NOVO — distribuição POR_AREA (planilha 1T2026)", () => {
  // 3 sócios em áreas distintas; pesos da planilha
  const sociosArea: SocioInput[] = [
    { id: "trib", nome: "Sócio Tributário", cargo: "Gestor Trib", publico: "SOCIO_CAPITAL",
      percentualQuotas: 0.10, originacaoEsperadaAnual: 0,
      areaPraticaCodigo: "tributario", isFundador: false },
    { id: "civ", nome: "Sócio Cível", cargo: "Gestor Cível", publico: "SOCIO_CAPITAL",
      percentualQuotas: 0.10, originacaoEsperadaAnual: 0,
      areaPraticaCodigo: "civel", isFundador: false },
    { id: "sem", nome: "Sócio Sem Área", cargo: "Gestor", publico: "SOCIO_CAPITAL",
      percentualQuotas: 0.10, originacaoEsperadaAnual: 0,
      isFundador: false },
  ];
  const pesosPlanilha = {
    mixOrganico: 0.76, mixIncremental: 0.24,
    pesosOrganico: { civel: 0.20, trabalhista: 0.20, societario: 0.10, tributario: 0.10,
                     imobiliario: 0.10, digital: 0.10, internacional: 0.10, ma: 0.10 },
    pesosIncremental: { civel: 0.10, trabalhista: 0.10, societario: 0.20, tributario: 0.20,
                        imobiliario: 0.10, digital: 0.10, internacional: 0.10, ma: 0.10 },
  };

  it("calcula peso = mixOrg×wOrg + mixInc×wInc", () => {
    const r = calcularModeloNovo({
      periodo, socios: sociosArea, resultados: baseResultados,
      premissas: { ...basePremissas, distribuicaoBlocoB: "POR_AREA", pesosPorArea: pesosPlanilha },
    });
    // pesoTrib = 0.76×0.10 + 0.24×0.20 = 0.076 + 0.048 = 0.124
    // pesoCivel = 0.76×0.20 + 0.24×0.10 = 0.152 + 0.024 = 0.176
    // pesoSem = 0
    // soma = 0.300
    // BlocoB total = 350.000
    // trib: 350000 × 0.124/0.300 = 144.666,67
    // civ:  350000 × 0.176/0.300 = 205.333,33
    // sem:  0
    const trib = r.pacotes.find((p) => p.socioId === "trib")!;
    const civ = r.pacotes.find((p) => p.socioId === "civ")!;
    const sem = r.pacotes.find((p) => p.socioId === "sem")!;
    expect(trib.blocoB).toBeCloseTo(144666.67, 1);
    expect(civ.blocoB).toBeCloseTo(205333.33, 1);
    expect(sem.blocoB).toBe(0);
    // Total ainda = 35% do RDA
    expect(trib.blocoB + civ.blocoB + sem.blocoB).toBeCloseTo(350000, 1);
  });

  it("sócio sem área recebe Bloco B = 0 mesmo sendo elegível", () => {
    const r = calcularModeloNovo({
      periodo, socios: [sociosArea[2]], resultados: baseResultados,
      premissas: { ...basePremissas, distribuicaoBlocoB: "POR_AREA", pesosPorArea: pesosPlanilha },
    });
    expect(r.pacotes[0].blocoB).toBe(0);
  });

  it("área desconhecida recebe peso 0", () => {
    const orfao: SocioInput = {
      id: "x", nome: "x", cargo: "x", publico: "SOCIO_CAPITAL",
      percentualQuotas: 0.1, originacaoEsperadaAnual: 0,
      areaPraticaCodigo: "area-inexistente", isFundador: false,
    };
    const r = calcularModeloNovo({
      periodo, socios: [orfao], resultados: baseResultados,
      premissas: { ...basePremissas, distribuicaoBlocoB: "POR_AREA", pesosPorArea: pesosPlanilha },
    });
    expect(r.pacotes[0].blocoB).toBe(0);
  });
});

// ============================================================================
// Regra: Fundadores recebem valor discricionário (BRL por sócio) abatido do LL
// antes do RDA; Bloco A é distribuído apenas entre não-fundadores.
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

  it("fundador com valorDiscricionario recebe o valor e fica fora do Bloco A", () => {
    const V = 100_000;
    const sociosV = sociosComFundador.map((s) =>
      s.id === "s1" ? { ...s, valorDiscricionario: V } : s,
    );
    const r = calcularModeloNovo({
      periodo, socios: sociosV, resultados: baseResultados,
      premissas: { ...basePremissas, distribuicaoBlocoB: "UNIFORME" },
    });
    const fund = r.pacotes.find((p) => p.socioId === "s1")!;
    const s2 = r.pacotes.find((p) => p.socioId === "s2")!;
    const s3 = r.pacotes.find((p) => p.socioId === "s3")!;
    // Fundador: recebe V em remuneracaoFundador, zero de Bloco A.
    expect(fund.remuneracaoFundador).toBeCloseTo(V, 1);
    expect(fund.blocoA).toBe(0);
    // RDA ajustado = LL − admin (0) − V = 1.000.000 − 100.000 = 900.000.
    // Bloco A = 900.000 × 0.45 = 405.000. Soma de quotas (não-fund) = 0.30.
    // s2: 405.000 × (0.20 / 0.30) = 270.000
    // s3: 405.000 × (0.10 / 0.30) = 135.000
    expect(s2.blocoA).toBeCloseTo(270_000, 1);
    expect(s3.blocoA).toBeCloseTo(135_000, 1);
    // Soma do Bloco A = 45% do RDA ajustado.
    expect(s2.blocoA + s3.blocoA).toBeCloseTo(405_000, 1);
    // Trace do fundador contém a etapa de remuneração de fundador; trace do não-fundador, o Bloco A.
    expect(fund.trace.find((t) => t.etapa === "3.fundador")?.valor).toBeCloseTo(V, 1);
    expect(s2.trace.find((t) => t.etapa === "8.bloco-A")?.valor).toBeCloseTo(270_000, 1);
  });

  it("sem discricionário (V=0), fundador continua fora do Bloco A (mudança intencional)", () => {
    const r = calcularModeloNovo({
      periodo, socios: sociosComFundador, resultados: baseResultados,
      premissas: { ...basePremissas, distribuicaoBlocoB: "UNIFORME" },
    });
    const fund = r.pacotes.find((p) => p.socioId === "s1")!;
    const s2 = r.pacotes.find((p) => p.socioId === "s2")!;
    const s3 = r.pacotes.find((p) => p.socioId === "s3")!;
    // Fundador: nada de fundador (V=0) e nada de Bloco A.
    expect(fund.remuneracaoFundador).toBe(0);
    expect(fund.blocoA).toBe(0);
    // RDA = LL (sem admin) = 1.000.000; Bloco A = 450.000 distribuído entre s2 e s3.
    // s2: 450.000 × (0.20/0.30) = 300.000; s3: 150.000.
    expect(s2.blocoA).toBeCloseTo(300_000, 1);
    expect(s3.blocoA).toBeCloseTo(150_000, 1);
  });

  it("fundadores não aparecem na base de quotas do Bloco A", () => {
    // 2 fundadores + 1 não-fundador. Sem discricionário: fundadores zerados,
    // não-fundador absorve 100% do Bloco A.
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
      premissas: { ...basePremissas, distribuicaoBlocoB: "UNIFORME" },
    });
    const n1 = r.pacotes.find((p) => p.socioId === "n1")!;
    // Bloco A = 1.000.000 × 0.45 = 450.000; n1 sozinho na base → recebe tudo.
    expect(n1.blocoA).toBeCloseTo(450_000, 1);
  });
});
