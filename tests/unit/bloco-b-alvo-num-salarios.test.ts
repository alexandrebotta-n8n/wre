// Testa o novo modo distribuicaoBlocoB="ALVO_NUM_SALARIOS" no engine NOVO.
// Cada sócio recebe (rem.gestão mensal + pró-labore mensal) × nº alvos.
// Se Σ alvos ≤ totalBlocoB: cada um recebe seu alvo (sobra vira reserva).
// Se Σ alvos > totalBlocoB: pro-rata proporcional ao alvo.
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

const resultadosBig = [
  { unidadeCodigo: "DSF", isMatriz: true, lucroLiquido: 10_000_000 }, // grande pra Σ alvos < Bloco B
];

describe("Bloco B — modo ALVO_NUM_SALARIOS", () => {
  it("Σ alvos ≤ Bloco B: cada sócio recebe seu alvo absoluto", () => {
    const r = calcularModeloNovo({
      periodo: { rotulo: "2026", tipo: "ANO", meses: 12 },
      socios: [
        // Alessandro (Capital-Gestor): rem.gestão 9600 + pró-labore 5000 = 14600; alvo 20 = R$ 292.000
        { id: "ale", nome: "Alessandro", cargo: "CEO", publico: "SOCIO_CAPITAL_GESTOR",
          percentualQuotas: 1.0, originacaoEsperadaAnual: 0, isFundador: false,
          nivelCargo: "A", faixaSalarial: "INICIAL", blocoBNumSalariosAlvo: 20 },
        // Bárbara (SOCIO_SERVICOS): só rem.gestão 11400 (sem pró-labore — Política DSF v1
        // exclui Sócios de Serviço de PUBLICOS_PRO_LABORE); alvo 10 = R$ 114.000
        { id: "bar", nome: "Bárbara", cargo: "Gestora", publico: "SOCIO_SERVICOS",
          percentualQuotas: 0, originacaoEsperadaAnual: 0, isFundador: false,
          remuneracaoGestaoMensalOverride: 11400, blocoBNumSalariosAlvo: 10 },
      ],
      resultados: resultadosBig,
      premissas: premissasBase,
    });
    expect(r.pacotes[0].blocoB).toBe(292_000);
    expect(r.pacotes[1].blocoB).toBe(114_000);
  });

  it("Σ alvos > Bloco B: pro-rata proporcional ao alvo", () => {
    // LL = 500k. RDA = LL diretamente (admin é despesa contábil já no LL líquido).
    // Bloco B = 35% × 500000 = 175000.
    // Alessandro: alvo = 14600 × 20 = 292000 (com pró-labore — Capital-Gestor).
    // Bárbara: alvo = 11400 × 10 = 114000 (sem pró-labore — Sócio de Serviço).
    // Σ alvos = 406000 > 175000 → pro-rata.
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
      resultados: [{ unidadeCodigo: "DSF", isMatriz: true, lucroLiquido: 500_000 }],
      premissas: premissasBase,
    });
    const totalBlocoB = 175_000;
    const somaAlvos = 292_000 + 114_000;
    const fator = totalBlocoB / somaAlvos;
    expect(r.pacotes[0].blocoB).toBeCloseTo(292_000 * fator, 1);
    expect(r.pacotes[1].blocoB).toBeCloseTo(114_000 * fator, 1);
    expect(r.pacotes[0].blocoB + r.pacotes[1].blocoB).toBeCloseTo(totalBlocoB, 0);
  });

  it("sócio sem blocoBNumSalariosAlvo (null/0) não recebe Bloco B", () => {
    const r = calcularModeloNovo({
      periodo: { rotulo: "2026", tipo: "ANO", meses: 12 },
      socios: [
        { id: "a", nome: "A", cargo: "X", publico: "SOCIO_CAPITAL_GESTOR",
          percentualQuotas: 0.5, originacaoEsperadaAnual: 0, isFundador: false,
          nivelCargo: "A", faixaSalarial: "INICIAL", blocoBNumSalariosAlvo: 20 },
        { id: "b", nome: "B", cargo: "X", publico: "SOCIO_CAPITAL_GESTOR",
          percentualQuotas: 0.5, originacaoEsperadaAnual: 0, isFundador: false,
          nivelCargo: "B", faixaSalarial: "INICIAL" /* sem alvo */ },
      ],
      resultados: resultadosBig,
      premissas: premissasBase,
    });
    expect(r.pacotes[0].blocoB).toBeGreaterThan(0);
    expect(r.pacotes[1].blocoB).toBe(0);
  });

  it("fundadores NÃO recebem nada no engine NOVO (zero em tudo)", () => {
    const r = calcularModeloNovo({
      periodo: { rotulo: "2026", tipo: "ANO", meses: 12 },
      socios: [
        { id: "f1", nome: "Décio", cargo: "Fundador", publico: "FUNDADOR",
          percentualQuotas: 0.15, originacaoEsperadaAnual: 0, isFundador: true,
          fundingFundadorAnual: 131_102.46 /* engine NOVO deve IGNORAR */ },
        { id: "ale", nome: "Alessandro", cargo: "CEO", publico: "SOCIO_CAPITAL_GESTOR",
          percentualQuotas: 0.85, originacaoEsperadaAnual: 0, isFundador: false,
          nivelCargo: "A", faixaSalarial: "INICIAL", blocoBNumSalariosAlvo: 20 },
      ],
      resultados: resultadosBig,
      premissas: premissasBase,
    });
    const decio = r.pacotes.find((p) => p.socioId === "f1")!;
    expect(decio.remuneracaoFundador).toBe(0);
    expect(decio.blocoA).toBe(0);
    expect(decio.blocoB).toBe(0);
    expect(decio.proLabore).toBe(0); // FUNDADOR não está em PUBLICOS_PRO_LABORE
    expect(decio.remuneracaoGestao).toBe(0); // FUNDADOR não está em PUBLICOS_REM_ADMIN
    expect(decio.total).toBe(0);
  });
});
