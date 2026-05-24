// Testa o tratamento de LIDER_TECNICO (CLT legado) no engine ATUAL
// (fator anualização 13.33) e SOCIO_SERVICOS no engine NOVO (rem. × 12).
import { describe, it, expect } from "vitest";
import { calcularModeloAtual } from "@/lib/domain/dsf/modelo-atual";
import { calcularModeloNovo } from "@/lib/domain/dsf/modelo-novo";
import type { InputModeloAtual, TabelaSalarial } from "@/lib/domain/dsf/tipos";

const tabela: TabelaSalarial = {
  A: { INICIAL: 9600, PLENO: 12000, EXPERT: 14400 },
  B: { INICIAL: 8000, PLENO: 10000, EXPERT: 12000 },
  C: { INICIAL: 6400, PLENO: 8000, EXPERT: 9600 },
  D: { INICIAL: 5600, PLENO: 7000, EXPERT: 8400 },
};

const premissasAtualBase = {
  proLaboreMensal: 5000,
  unidadeMatriz: "DSF",
  reservaPercentual: 0.05,
  reservaViraPremio: true,
  tabelaSalarial: tabela,
};

const resultadosBase = [
  { unidadeCodigo: "DSF", isMatriz: true, lucroLiquido: 1_000_000 },
];

describe("Política ATUAL — Líder Técnico CLT (fator default 14.4)", () => {
  it("rem. de gestão anual = mensal × 14.4 quando público=LIDER_TECNICO", () => {
    const input: InputModeloAtual = {
      periodo: { rotulo: "2026", tipo: "ANO", meses: 12 },
      socios: [{
        id: "lt1",
        nome: "Bruna Licks",
        cargo: "Líder Técnico",
        publico: "LIDER_TECNICO",
        percentualQuotas: 0,
        originacaoEsperadaAnual: 0,
        isFundador: false,
        remuneracaoGestaoMensalOverride: 10_405,
      }],
      resultados: resultadosBase,
      premissas: premissasAtualBase,
    };
    const r = calcularModeloAtual(input);
    // 10405 × 14.4 = 149.832 (default CLT completo com FGTS)
    expect(r.pacotes[0].remuneracaoGestao).toBeCloseTo(149_832, 2);
  });

  it("fator CLT é configurável via mesesAnualLiderTecnicoCLT (ex: 12 = sem benefícios)", () => {
    const input: InputModeloAtual = {
      periodo: { rotulo: "2026", tipo: "ANO", meses: 12 },
      socios: [{
        id: "lt1",
        nome: "Samuel",
        cargo: "Líder Técnico",
        publico: "LIDER_TECNICO",
        percentualQuotas: 0,
        originacaoEsperadaAnual: 0,
        isFundador: false,
        remuneracaoGestaoMensalOverride: 10_000,
      }],
      resultados: resultadosBase,
      premissas: { ...premissasAtualBase, mesesAnualLiderTecnicoCLT: 12 },
    };
    const r = calcularModeloAtual(input);
    expect(r.pacotes[0].remuneracaoGestao).toBe(120_000);
  });

  it("LIDER_TECNICO não recebe pró-labore", () => {
    const input: InputModeloAtual = {
      periodo: { rotulo: "2026", tipo: "ANO", meses: 12 },
      socios: [{
        id: "lt1",
        nome: "Juliana",
        cargo: "Líder Técnico",
        publico: "LIDER_TECNICO",
        percentualQuotas: 0,
        originacaoEsperadaAnual: 0,
        isFundador: false,
        remuneracaoGestaoMensalOverride: 12_052,
      }],
      resultados: resultadosBase,
      premissas: premissasAtualBase,
    };
    const r = calcularModeloAtual(input);
    expect(r.pacotes[0].proLabore).toBe(0);
  });

  it("LIDER_TECNICO com quota=0 não recebe distribuição residual", () => {
    const input: InputModeloAtual = {
      periodo: { rotulo: "2026", tipo: "ANO", meses: 12 },
      socios: [
        { id: "lt1", nome: "Silvia", cargo: "Líder Técnico", publico: "LIDER_TECNICO",
          percentualQuotas: 0, originacaoEsperadaAnual: 0, isFundador: false,
          remuneracaoGestaoMensalOverride: 13_141 },
        { id: "sc1", nome: "Sócio A", cargo: "Sócio", publico: "SOCIO_CAPITAL_GESTOR",
          percentualQuotas: 1.0, originacaoEsperadaAnual: 0, isFundador: false },
      ],
      resultados: resultadosBase,
      premissas: premissasAtualBase,
    };
    const r = calcularModeloAtual(input);
    expect(r.pacotes[0].blocoB).toBe(0); // sem distribuição residual
    expect(r.pacotes[1].blocoB).toBeGreaterThan(0); // Sócio A absorve tudo
  });

  it("período TRIMESTRE proporcionaliza o fator CLT (default 14.4 × 3/12 = 3.6)", () => {
    const input: InputModeloAtual = {
      periodo: { rotulo: "1T2026", tipo: "TRIMESTRE", meses: 3 },
      socios: [{
        id: "lt1",
        nome: "Francieli",
        cargo: "Líder Técnico",
        publico: "LIDER_TECNICO",
        percentualQuotas: 0,
        originacaoEsperadaAnual: 0,
        isFundador: false,
        remuneracaoGestaoMensalOverride: 7_480,
      }],
      resultados: resultadosBase,
      premissas: premissasAtualBase,
    };
    const r = calcularModeloAtual(input);
    // 7480 × 14.4 × 3/12 = 7480 × 3.6 = 26.928
    expect(r.pacotes[0].remuneracaoGestao).toBeCloseTo(7_480 * 14.4 * 3 / 12, 2);
  });
});

describe("Política NOVA — Sócio de Serviços (rem. × 12)", () => {
  it("rem. de gestão anual = mensal × 12 para SOCIO_SERVICOS", () => {
    const r = calcularModeloNovo({
      periodo: { rotulo: "2026", tipo: "ANO", meses: 12 },
      socios: [{
        id: "ss1",
        nome: "Luiza Moulin",
        cargo: "Líder Técnico",
        publico: "SOCIO_SERVICOS",
        percentualQuotas: 0,
        originacaoEsperadaAnual: 0,
        isFundador: false,
        remuneracaoGestaoMensalOverride: 13_141,
      }],
      resultados: resultadosBase,
      premissas: {
        percentualBlocoA: 0.45, percentualBlocoB: 0.35, percentualBlocoC: 0.20,
        poolSociedade: 0.5, poolLider: 0.3, poolEquipeReserva: 0.2,
        chaveOriginacao: 0.3, chaveExecucao: 0.6, chaveGestaoCP: 0.1,
        faixaOrigMin: 0.2, faixaOrigMax: 0.4,
        faixaExecMin: 0.5, faixaExecMax: 0.7,
        faixaGestaoMin: 0, faixaGestaoMax: 0.15,
        proRataMinMeses: 3,
        distribuicaoBlocoB: "UNIFORME",
        tabelaSalarial: tabela,
      },
    });
    // 13141 × 12 = 157.692
    expect(r.pacotes[0].remuneracaoGestao).toBe(157_692);
  });

  it("SOCIO_SERVICOS entra no rateio do Bloco B (UNIFORME)", () => {
    const r = calcularModeloNovo({
      periodo: { rotulo: "2026", tipo: "ANO", meses: 12 },
      socios: [
        { id: "sc1", nome: "Sócio Capital", cargo: "Sócio", publico: "SOCIO_CAPITAL",
          percentualQuotas: 0.5, originacaoEsperadaAnual: 0, isFundador: false },
        { id: "ss1", nome: "Líd Téc 1", cargo: "Líder Técnico", publico: "SOCIO_SERVICOS",
          percentualQuotas: 0, originacaoEsperadaAnual: 0, isFundador: false },
        { id: "ss2", nome: "Líd Téc 2", cargo: "Líder Técnico", publico: "SOCIO_SERVICOS",
          percentualQuotas: 0, originacaoEsperadaAnual: 0, isFundador: false },
      ],
      resultados: resultadosBase,
      premissas: {
        percentualBlocoA: 0.45, percentualBlocoB: 0.35, percentualBlocoC: 0.20,
        poolSociedade: 0.5, poolLider: 0.3, poolEquipeReserva: 0.2,
        chaveOriginacao: 0.3, chaveExecucao: 0.6, chaveGestaoCP: 0.1,
        faixaOrigMin: 0.2, faixaOrigMax: 0.4,
        faixaExecMin: 0.5, faixaExecMax: 0.7,
        faixaGestaoMin: 0, faixaGestaoMax: 0.15,
        proRataMinMeses: 3,
        distribuicaoBlocoB: "UNIFORME",
        tabelaSalarial: tabela,
      },
    });
    // Bloco B = 35% × 1M = 350k dividido em 3 (UNIFORME entre os 3 elegíveis)
    const blocoBPorSocio = 350_000 / 3;
    expect(r.pacotes[0].blocoB).toBeCloseTo(blocoBPorSocio, 2);
    expect(r.pacotes[1].blocoB).toBeCloseTo(blocoBPorSocio, 2);
    expect(r.pacotes[2].blocoB).toBeCloseTo(blocoBPorSocio, 2);
  });

  it("SOCIO_SERVICOS NÃO recebe Bloco A (capital)", () => {
    const r = calcularModeloNovo({
      periodo: { rotulo: "2026", tipo: "ANO", meses: 12 },
      socios: [{
        id: "ss1", nome: "Líd Téc", cargo: "Líder Técnico", publico: "SOCIO_SERVICOS",
        percentualQuotas: 0.5, originacaoEsperadaAnual: 0, isFundador: false,
      }],
      resultados: resultadosBase,
      premissas: {
        percentualBlocoA: 0.45, percentualBlocoB: 0.35, percentualBlocoC: 0.20,
        poolSociedade: 0.5, poolLider: 0.3, poolEquipeReserva: 0.2,
        chaveOriginacao: 0.3, chaveExecucao: 0.6, chaveGestaoCP: 0.1,
        faixaOrigMin: 0.2, faixaOrigMax: 0.4,
        faixaExecMin: 0.5, faixaExecMax: 0.7,
        faixaGestaoMin: 0, faixaGestaoMax: 0.15,
        proRataMinMeses: 3,
        distribuicaoBlocoB: "UNIFORME",
        tabelaSalarial: tabela,
      },
    });
    expect(r.pacotes[0].blocoA).toBe(0);
  });
});
