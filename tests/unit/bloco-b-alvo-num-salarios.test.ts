// Testa a regra ÚNICA de distribuição do Bloco B no engine NOVO (Política DSF v1).
// Cada sócio recebe (pró-labore mensal + rem.gestão mensal) × nº alvos.
// Se Σ alvos ≤ totalBlocoB: cada um recebe seu alvo (sobra vira reserva).
// Se Σ alvos > totalBlocoB: pro-rata proporcional ao alvo.
// Antes era configurável via distribuicaoBlocoB; hoje é hardcoded no engine.
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

  // --- 5 casos novos (substituem os modos UNIFORME/PESO_INDIVIDUAL/etc removidos) ---

  it("base mensal = (pró-labore + rem.gestão) — Sócio de Capital recebe os dois", () => {
    // Capital-Gestor (Nível B, INICIAL → 8.000) + pró-labore 5.000 = base 13.000.
    // Alvo 10 → R$ 130.000. RDA grande pra evitar pro-rata.
    const r = calcularModeloNovo({
      periodo: { rotulo: "2026", tipo: "ANO", meses: 12 },
      socios: [
        { id: "a", nome: "A", cargo: "Diretor", publico: "SOCIO_CAPITAL_GESTOR",
          percentualQuotas: 1.0, originacaoEsperadaAnual: 0, isFundador: false,
          nivelCargo: "B", faixaSalarial: "INICIAL", blocoBNumSalariosAlvo: 10 },
      ],
      resultados: resultadosBig,
      premissas: premissasBase,
    });
    expect(r.pacotes[0].blocoB).toBe(130_000);
  });

  it("base mensal NÃO inclui pró-labore para Sócio de Serviços (Política DSF v1)", () => {
    // SOCIO_SERVICOS está fora de PUBLICOS_PRO_LABORE; base = só rem.gestão.
    // Nível B PLENO = 10.000. Alvo 10 → R$ 100.000 (não 150.000).
    const r = calcularModeloNovo({
      periodo: { rotulo: "2026", tipo: "ANO", meses: 12 },
      socios: [
        { id: "a", nome: "A", cargo: "Gestor", publico: "SOCIO_SERVICOS",
          percentualQuotas: 0, originacaoEsperadaAnual: 0, isFundador: false,
          nivelCargo: "B", faixaSalarial: "PLENO", blocoBNumSalariosAlvo: 10 },
      ],
      resultados: resultadosBig,
      premissas: premissasBase,
    });
    expect(r.pacotes[0].blocoB).toBe(100_000);
  });

  it("overrides individuais (proLaboreMensal, remGestaoMensal) prevalecem sobre premissa/tabela", () => {
    // Pró-labore override 7.000 + rem.gestão override 15.000 = base 22.000.
    // Alvo 5 → R$ 110.000. (Ignora a tabela e o proLaboreMensal=5000 da premissa.)
    const r = calcularModeloNovo({
      periodo: { rotulo: "2026", tipo: "ANO", meses: 12 },
      socios: [
        { id: "a", nome: "A", cargo: "X", publico: "SOCIO_CAPITAL_GESTOR",
          percentualQuotas: 1.0, originacaoEsperadaAnual: 0, isFundador: false,
          nivelCargo: "D", faixaSalarial: "INICIAL",
          proLaboreMensalOverride: 7000,
          remuneracaoGestaoMensalOverride: 15000,
          blocoBNumSalariosAlvo: 5 },
      ],
      resultados: resultadosBig,
      premissas: premissasBase,
    });
    expect(r.pacotes[0].blocoB).toBe(110_000);
  });

  it("sócio sem cargo/faixa (rem.gestão = 0): base = só pró-labore", () => {
    // Capital sem nivelCargo/faixaSalarial → rem.gestão = 0.
    // Pró-labore 5.000 (premissa) × alvo 4 = R$ 20.000.
    const r = calcularModeloNovo({
      periodo: { rotulo: "2026", tipo: "ANO", meses: 12 },
      socios: [
        { id: "a", nome: "A", cargo: "X", publico: "SOCIO_CAPITAL",
          percentualQuotas: 1.0, originacaoEsperadaAnual: 0, isFundador: false,
          blocoBNumSalariosAlvo: 4 },
      ],
      resultados: resultadosBig,
      premissas: premissasBase,
    });
    expect(r.pacotes[0].blocoB).toBe(20_000);
  });

  it("sócio sem alvo é EXCLUÍDO do pro-rata (só os com alvo dividem o pool)", () => {
    // 2 sócios com alvo grande + 1 sem alvo. Base = 8000 + 5000 = 13000.
    // Σ alvos = 2 × (13000 × 30) = 780k. Bloco B = 35% × 1M = 350k.
    // Σ > Bloco B → pro-rata; cada um com alvo recebe 350k / 2 = 175k.
    // O sem alvo não entra no Σ nem recebe nada.
    const r = calcularModeloNovo({
      periodo: { rotulo: "2026", tipo: "ANO", meses: 12 },
      socios: [
        { id: "a", nome: "A", cargo: "X", publico: "SOCIO_CAPITAL_GESTOR",
          percentualQuotas: 0.4, originacaoEsperadaAnual: 0, isFundador: false,
          nivelCargo: "B", faixaSalarial: "INICIAL", blocoBNumSalariosAlvo: 30 },
        { id: "b", nome: "B", cargo: "X", publico: "SOCIO_CAPITAL_GESTOR",
          percentualQuotas: 0.4, originacaoEsperadaAnual: 0, isFundador: false,
          nivelCargo: "B", faixaSalarial: "INICIAL", blocoBNumSalariosAlvo: 30 },
        { id: "c", nome: "C", cargo: "X", publico: "SOCIO_CAPITAL_GESTOR",
          percentualQuotas: 0.2, originacaoEsperadaAnual: 0, isFundador: false,
          nivelCargo: "B", faixaSalarial: "INICIAL" /* sem alvo */ },
      ],
      resultados: [{ unidadeCodigo: "DSF", isMatriz: true, lucroLiquido: 1_000_000 }],
      premissas: premissasBase,
    });
    const pa = r.pacotes.find((p) => p.socioId === "a")!;
    const pb = r.pacotes.find((p) => p.socioId === "b")!;
    const pc = r.pacotes.find((p) => p.socioId === "c")!;
    expect(pa.blocoB).toBeCloseTo(175_000, 0);
    expect(pb.blocoB).toBeCloseTo(175_000, 0);
    expect(pc.blocoB).toBe(0);
    // Total distribuído = Bloco B inteiro (sem sobra para reserva no B).
    expect(pa.blocoB + pb.blocoB + pc.blocoB).toBeCloseTo(350_000, 0);
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
