// Bloco C — distribuído com mesma fórmula do Bloco B quando modo é
// ALVO_NUM_SALARIOS. Reusa `blocoBNumSalariosAlvo`. Sobra (caso Σ alvos
// < totalBlocoC) vira reserva central.
import { describe, it, expect } from "vitest";
import { calcularModeloNovo } from "@/lib/domain/dsf/modelo-novo";
import type { TabelaSalarial } from "@/lib/domain/dsf/tipos";

const tabela: TabelaSalarial = {
  A: { INICIAL: 9600, PLENO: 12000, EXPERT: 14400 },
  B: { INICIAL: 8000, PLENO: 10000, EXPERT: 12000 },
  C: { INICIAL: 6400, PLENO: 8000, EXPERT: 9600 },
  D: { INICIAL: 5600, PLENO: 7000, EXPERT: 8400 },
};

const premissasBase = {
  percentualBlocoA: 0.45,
  percentualBlocoB: 0.35,
  percentualBlocoC: 0.20,
  poolSociedade: 0.5,
  poolLider: 0.3,
  poolEquipeReserva: 0.2,
  chaveOriginacao: 0.3,
  chaveExecucao: 0.6,
  chaveGestaoCP: 0.1,
  faixaOrigMin: 0.2,
  faixaOrigMax: 0.4,
  faixaExecMin: 0.5,
  faixaExecMax: 0.7,
  faixaGestaoMin: 0,
  faixaGestaoMax: 0.15,
  proRataMinMeses: 3,
  distribuicaoBlocoB: "ALVO_NUM_SALARIOS" as const,
  proLaboreMensal: 5000,
  tabelaSalarial: tabela,
};

describe("Bloco C — distribuído (modo ALVO_NUM_SALARIOS)", () => {
  it("Σ alvos ≤ Bloco C: cada sócio recebe alvo cheio; sobra fica em reservaCentral", () => {
    // LL grande → Bloco C = 20% × 100M = 20M (>> alvos).
    const r = calcularModeloNovo({
      periodo: { rotulo: "2026", tipo: "ANO", meses: 12 },
      socios: [
        { id: "ale", nome: "Alessandro", cargo: "CEO", publico: "SOCIO_CAPITAL_GESTOR",
          percentualQuotas: 1.0, originacaoEsperadaAnual: 0, isFundador: false,
          nivelCargo: "A", faixaSalarial: "INICIAL", blocoBNumSalariosAlvo: 20 },
        { id: "bar", nome: "Bárbara", cargo: "Gestora", publico: "SOCIO_SERVICOS",
          percentualQuotas: 0, originacaoEsperadaAnual: 0, isFundador: false,
          remuneracaoGestaoMensalOverride: 11400, blocoBNumSalariosAlvo: 10 },
      ],
      resultados: [{ unidadeCodigo: "DSF", isMatriz: true, lucroLiquido: 100_000_000 }],
      premissas: premissasBase,
    });
    // Alvos Bloco C (mesma fórmula B): Alessandro 292.000, Bárbara 114.000.
    expect(r.pacotes[0].blocoC).toBe(292_000);
    expect(r.pacotes[1].blocoC).toBe(114_000);
    // totalBlocoC = 20.000.000; distribuído = 406.000; reserva = sobra
    expect(r.totalReservaCentral).toBeCloseTo(20_000_000 - 406_000, 0);
  });

  it("Σ alvos > Bloco C: pro-rata; reservaCentral = 0", () => {
    // LL pequeno → Bloco C limitado, alvos estouram.
    const r = calcularModeloNovo({
      periodo: { rotulo: "2026", tipo: "ANO", meses: 12 },
      socios: [
        { id: "ale", nome: "Alessandro", cargo: "CEO", publico: "SOCIO_CAPITAL_GESTOR",
          percentualQuotas: 1.0, originacaoEsperadaAnual: 0, isFundador: false,
          nivelCargo: "A", faixaSalarial: "INICIAL", blocoBNumSalariosAlvo: 20 },
        { id: "bar", nome: "Bárbara", cargo: "Gestora", publico: "SOCIO_SERVICOS",
          percentualQuotas: 0, originacaoEsperadaAnual: 0, isFundador: false,
          remuneracaoGestaoMensalOverride: 11400, blocoBNumSalariosAlvo: 10 },
      ],
      resultados: [{ unidadeCodigo: "DSF", isMatriz: true, lucroLiquido: 1_000_000 }],
      premissas: premissasBase,
    });
    // totalBlocoC = 20% × 1M = 200.000. Σ alvos = 406.000.
    const fator = 200_000 / 406_000;
    expect(r.pacotes[0].blocoC).toBeCloseTo(292_000 * fator, 1);
    expect(r.pacotes[1].blocoC).toBeCloseTo(114_000 * fator, 1);
    expect(r.pacotes[0].blocoC + r.pacotes[1].blocoC).toBeCloseTo(200_000, 0);
    expect(r.totalReservaCentral).toBeCloseTo(0, 1);
  });

  it("modos diferentes de ALVO_NUM_SALARIOS: Bloco C continua retido", () => {
    const r = calcularModeloNovo({
      periodo: { rotulo: "2026", tipo: "ANO", meses: 12 },
      socios: [
        { id: "ale", nome: "Alessandro", cargo: "CEO", publico: "SOCIO_CAPITAL_GESTOR",
          percentualQuotas: 1.0, originacaoEsperadaAnual: 0, isFundador: false,
          nivelCargo: "A", faixaSalarial: "INICIAL", blocoBNumSalariosAlvo: 20 },
      ],
      resultados: [{ unidadeCodigo: "DSF", isMatriz: true, lucroLiquido: 1_000_000 }],
      premissas: { ...premissasBase, distribuicaoBlocoB: "UNIFORME" as const },
    });
    expect(r.pacotes[0].blocoC).toBe(0);
    expect(r.totalReservaCentral).toBeCloseTo(200_000, 1); // 20% × 1M
  });

  it("pró-labore só para Sócios de Capital; Sócio de Serviço não recebe", () => {
    const r = calcularModeloNovo({
      periodo: { rotulo: "2026", tipo: "ANO", meses: 12 },
      socios: [
        { id: "ale", nome: "Alessandro", cargo: "CEO", publico: "SOCIO_CAPITAL_GESTOR",
          percentualQuotas: 1.0, originacaoEsperadaAnual: 0, isFundador: false,
          nivelCargo: "A", faixaSalarial: "INICIAL" },
        { id: "bar", nome: "Bárbara", cargo: "Gestora", publico: "SOCIO_SERVICOS",
          percentualQuotas: 0, originacaoEsperadaAnual: 0, isFundador: false,
          remuneracaoGestaoMensalOverride: 11400 },
      ],
      resultados: [{ unidadeCodigo: "DSF", isMatriz: true, lucroLiquido: 1_000_000 }],
      premissas: premissasBase,
    });
    // Alessandro: pró-labore 5000 × 12 = 60.000
    expect(r.pacotes[0].proLabore).toBe(60_000);
    // Bárbara (SOCIO_SERVICOS): pró-labore = 0
    expect(r.pacotes[1].proLabore).toBe(0);
  });

  it("RDA = LL (não deduz admin) — Bloco A reflete LL inteiro", () => {
    const r = calcularModeloNovo({
      periodo: { rotulo: "2026", tipo: "ANO", meses: 12 },
      socios: [
        { id: "a", nome: "A", cargo: "X", publico: "SOCIO_CAPITAL_GESTOR",
          percentualQuotas: 1.0, originacaoEsperadaAnual: 0, isFundador: false,
          nivelCargo: "A", faixaSalarial: "INICIAL" },
      ],
      resultados: [{ unidadeCodigo: "DSF", isMatriz: true, lucroLiquido: 8_000_000 }],
      premissas: { ...premissasBase, distribuicaoBlocoB: "UNIFORME" as const },
    });
    // Bloco A = 45% × 8M = 3,6M (sem deduzir admin)
    expect(r.pacotes[0].blocoA).toBeCloseTo(3_600_000, 0);
  });
});
