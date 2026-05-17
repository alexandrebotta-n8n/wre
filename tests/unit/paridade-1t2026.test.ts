// Teste de paridade: o engine ATUAL deve reproduzir os totais da planilha
// "Sistema ATUAL de Remuneração DSF — 1º trimestre 2026.xlsx".
//
// Valores esperados (extraídos da aba "SISTEMA DE REMUNERAÇÃO"):
//   - LL DSF Consolidado: 1.394.712,16
//   - LL Unidade BG: 1.041.022,54  /  Funding BG: 881.598
//   - Total Rem. Fundadores (trim): 262.204,88 (=131.102,44 × 2)
//   - Total Distribuição Sócios não-fund (trim): 1.075.881,92
//   - Reserva 5% sobre funding DSF: 56.625,36
//   - Prêmio uniforme por sócio elegível: 4.718,78 (=56.625,36 / 12)
//   - Total "1º TRIM 2025" da planilha (rem.gestão + fundadores + distribuição):
//     1.590.086,80 (NÃO inclui pró-labore nem prêmio)

import { describe, it, expect } from "vitest";
import { calcularModeloAtual } from "@/lib/domain/dsf/modelo-atual";
import type {
  InputModeloAtual, TabelaSalarial, SocioInput, ResultadoUnidade,
} from "@/lib/domain/dsf/tipos";

const tabela: TabelaSalarial = {
  A: { INICIAL: 9600, PLENO: 12000, EXPERT: 14400 },
  B: { INICIAL: 8000, PLENO: 10000, EXPERT: 12000 },
  C: { INICIAL: 6400, PLENO: 8000, EXPERT: 9600 },
  D: { INICIAL: 5600, PLENO: 7000, EXPERT: 8400 },
};

// 14 sócios reais da planilha + 8 líderes técnicos + 1 líder unidade.
// Públicos no Modelo Atual: FUNDADOR para Décio/Gilberto; SOCIO_CAPITAL_GESTOR
// para os demais (no atual todos os "sócios de capital" têm cargo de gestão).
const socios: SocioInput[] = [
  { id: "decio", nome: "Jose Décio Dupont", cargo: "Fundador", publico: "FUNDADOR",
    percentualQuotas: 0.14871, originacaoEsperadaAnual: 0, isFundador: true,
    fundingFundadorAnual: 131102.44},
  { id: "gilberto", nome: "Gilberto Antonio Spiller", cargo: "Fundador", publico: "FUNDADOR",
    percentualQuotas: 0.14871, originacaoEsperadaAnual: 0, isFundador: true,
    fundingFundadorAnual: 131102.44},
  { id: "alessandro", nome: "Alessandro Spiller", cargo: "CEO", publico: "SOCIO_CAPITAL_GESTOR",
    percentualQuotas: 0.13184, originacaoEsperadaAnual: 0, nivelCargo: "A", faixaSalarial: "INICIAL", isFundador: false },
  { id: "fadanelli", nome: "Jose Claudio Fadanelli", cargo: "Diretor Exec. Novos Negócios", publico: "SOCIO_CAPITAL_GESTOR",
    percentualQuotas: 0.115374, originacaoEsperadaAnual: 0, nivelCargo: "B", faixaSalarial: "INICIAL", isFundador: false },
  { id: "ronei", nome: "Ronei Giacomoni", cargo: "Diretor Exec. Comercial e Marketing", publico: "SOCIO_CAPITAL_GESTOR",
    percentualQuotas: 0.09161, originacaoEsperadaAnual: 0, nivelCargo: "B", faixaSalarial: "INICIAL", isFundador: false },
  { id: "abel", nome: "Ricardo Abel Guarnieri", cargo: "Diretor Exec. Intel. Jurídica e RI", publico: "SOCIO_CAPITAL_GESTOR",
    percentualQuotas: 0.06186, originacaoEsperadaAnual: 0, nivelCargo: "B", faixaSalarial: "INICIAL", isFundador: false },
  { id: "tiago", nome: "Tiago Alves", cargo: "Diretor Exec. Operações", publico: "SOCIO_CAPITAL_GESTOR",
    percentualQuotas: 0.04503, originacaoEsperadaAnual: 0, nivelCargo: "B", faixaSalarial: "INICIAL", isFundador: false },
  { id: "leandro", nome: "Leandro Jose Caon", cargo: "Gestor Direito Tributário", publico: "SOCIO_CAPITAL_GESTOR",
    percentualQuotas: 0.06186, originacaoEsperadaAnual: 0, nivelCargo: "C", faixaSalarial: "INICIAL", isFundador: false },
  { id: "barbara", nome: "Bárbara Ravanello", cargo: "Gestora Direito Digital e TI", publico: "SOCIO_CAPITAL_GESTOR",
    percentualQuotas: 0.02326, originacaoEsperadaAnual: 0, nivelCargo: "C", faixaSalarial: "INICIAL", isFundador: false },
  { id: "jonathan", nome: "Jonathan Piva de Almeida", cargo: "Gestor Direito Societário", publico: "SOCIO_CAPITAL_GESTOR",
    percentualQuotas: 0.024723, originacaoEsperadaAnual: 0, nivelCargo: "C", faixaSalarial: "INICIAL", isFundador: false },
  { id: "fabio", nome: "Fabio Stefani", cargo: "Gestor Direito Internacional", publico: "SOCIO_CAPITAL_GESTOR",
    percentualQuotas: 0.02326, originacaoEsperadaAnual: 0, nivelCargo: "C", faixaSalarial: "INICIAL", isFundador: false },
  { id: "guilherme", nome: "Guilherme Spiller", cargo: "Gestor Direito Agro", publico: "SOCIO_CAPITAL_GESTOR",
    percentualQuotas: 0.06186, originacaoEsperadaAnual: 0, nivelCargo: "D", faixaSalarial: "INICIAL", isFundador: false },
  { id: "gabriel", nome: "Gabriel Fontanive Dupont", cargo: "Gestor Inovação", publico: "SOCIO_CAPITAL_GESTOR",
    percentualQuotas: 0.03718, originacaoEsperadaAnual: 0, nivelCargo: "D", faixaSalarial: "INICIAL", isFundador: false },
  { id: "keila", nome: "Keila Reichert", cargo: "Gestora Governança", publico: "SOCIO_CAPITAL_GESTOR",
    percentualQuotas: 0.024723, originacaoEsperadaAnual: 0, nivelCargo: "D", faixaSalarial: "INICIAL", isFundador: false },
];

const resultados: ResultadoUnidade[] = [
  { unidadeCodigo: "DSF", isMatriz: true, lucroLiquido: 1394712.16 },
  { unidadeCodigo: "BG", isMatriz: false, lucroLiquido: 1041022.54, fundingVariavel: 881598 },
];

const premissas = {
  proLaboreMensal: 5000,
  unidadeFundadores: "BG",
  unidadeMatriz: "DSF",
  reservaPercentual: 0.05,
  reservaViraPremio: true,
  tabelaSalarial: tabela,
};

describe("Paridade 1T2026 — Modelo ATUAL vs planilha", () => {
  const input: InputModeloAtual = {
    periodo: { rotulo: "1T2026", tipo: "TRIMESTRE", meses: 3 },
    socios,
    resultados,
    premissas,
  };
  const r = calcularModeloAtual(input);

  const total = (campo: keyof typeof r.pacotes[number]) =>
    r.pacotes.reduce((acc, p) => acc + (typeof p[campo] === "number" ? (p[campo] as number) : 0), 0);

  it("Total pró-labore trimestral = R$ 210.000 (14 × 5.000 × 3)", () => {
    expect(total("proLabore")).toBe(14 * 5000 * 3);
  });

  it("Total remuneração de gestão trimestral = R$ 252.000 (planilha: R$ 84.000 mensal × 3)", () => {
    // 1×9600 (A) + 4×8000 (B) + 4×6400 (C) + 3×5600 (D) = 9600+32000+25600+16800 = 84000 mensal
    expect(total("remuneracaoGestao")).toBe(84000 * 3);
  });

  it("Total remuneração de fundadores ≈ R$ 262.204,88 (planilha)", () => {
    expect(total("remuneracaoFundador")).toBeCloseTo(262204.88, 1);
  });

  it("Total distribuição sócios não-fund (95%) ≈ R$ 1.075.881,92", () => {
    expect(total("blocoB")).toBeCloseTo(1075881.92, 0);
  });

  it("Cada sócio elegível (12) recebe prêmio uniforme ≈ R$ 4.718,78", () => {
    const elegiveis = r.pacotes.filter((p) => p.publico === "SOCIO_CAPITAL_GESTOR");
    expect(elegiveis).toHaveLength(12);
    for (const p of elegiveis) {
      expect(p.premio).toBeCloseTo(4718.78, 0);
    }
    // Total do prêmio = total da reserva (5% × funding DSF)
    expect(total("premio")).toBeCloseTo(56625.36, 0);
  });

  it("Total geral 'planilha' (gestão + fundadores + distribuição, sem prêmio) ≈ R$ 1.590.086,80", () => {
    const totalPlanilha = total("remuneracaoGestao") + total("remuneracaoFundador") + total("blocoB");
    expect(totalPlanilha).toBeCloseTo(1590086.80, 0);
  });

  it("Alessandro (CEO, 13.184%) — bate com a planilha", () => {
    const a = r.pacotes.find((p) => p.socioId === "alessandro")!;
    // Da planilha: P.Lab 5k×3=15k / Gestão 9.6k×3=28.8k / Distribuição 201.890,56 / Prêmio 4.718,78
    expect(a.proLabore).toBe(15000);
    expect(a.remuneracaoGestao).toBe(28800);
    expect(a.blocoB).toBeCloseTo(201890.56, 1);
    expect(a.premio).toBeCloseTo(4718.78, 1);
    // Total na planilha (col "Lucro liquido"): 230.690,56 (gestão+distribuição, sem pró-lab nem prêmio)
    // Total no engine: tudo somado
    expect(a.total).toBeCloseTo(15000 + 28800 + 201890.56 + 4718.78, 1);
  });

  it("Sem alertas ERROR de não-sobreposição no Modelo Atual", () => {
    const erros = r.pacotes.flatMap((p) => p.alertasNaoSobreposicao).filter((a) => a.includes("[ERROR]"));
    expect(erros).toEqual([]);
  });
});
