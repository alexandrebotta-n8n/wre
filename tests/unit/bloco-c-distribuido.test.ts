// Bloco C — DIFERIDO (Política DSF v1, item 3.3.4).
//
// Default = 0 para todos. Só recebe quando há valor manual cadastrado em
// `Socio.blocoCValorManualAno` (deliberação estratégica formal). Tudo
// que não é alocado vira `totalReservaCentral` (20% × RDA − Σ manuais).
//
// Antes existia distribuição automática via mesma fórmula do Bloco B
// (ALVO_NUM_SALARIOS) — foi removida para refletir o caráter diferido.
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

describe("Bloco C — diferido (apenas valor manual)", () => {
  it("nenhum sócio com manual: Bloco C inteiro vai pra reservaCentral", () => {
    const r = calcularModeloNovo({
      periodo: { rotulo: "2026", tipo: "ANO", meses: 12 },
      socios: [
        // Mesmo com alvo de Bloco B preenchido, sem manual de C → C = 0.
        { id: "ale", nome: "Alessandro", cargo: "CEO", publico: "SOCIO_CAPITAL_GESTOR",
          percentualQuotas: 1.0, originacaoEsperadaAnual: 0, isFundador: false,
          nivelCargo: "A", faixaSalarial: "INICIAL", blocoBNumSalariosAlvo: 20 },
      ],
      resultados: [{ unidadeCodigo: "DSF", isMatriz: true, lucroLiquido: 1_000_000 }],
      premissas: premissasBase,
    });
    expect(r.pacotes[0].blocoC).toBe(0);
    expect(r.totalReservaCentral).toBeCloseTo(200_000, 1); // 20% × 1M
  });

  it("manual=120.000 em período ANO: blocoC = 120.000; reserva = totalBlocoC − 120k", () => {
    const r = calcularModeloNovo({
      periodo: { rotulo: "2026", tipo: "ANO", meses: 12 },
      socios: [
        { id: "ric", nome: "Ricardo", cargo: "Diretor", publico: "SOCIO_CAPITAL_GESTOR",
          percentualQuotas: 0.5, originacaoEsperadaAnual: 0, isFundador: false,
          nivelCargo: "B", faixaSalarial: "INICIAL",
          blocoCValorManualAno: 120_000 },
        // Sem manual: Bloco C = 0.
        { id: "out", nome: "Outro", cargo: "Sócio", publico: "SOCIO_CAPITAL_GESTOR",
          percentualQuotas: 0.5, originacaoEsperadaAnual: 0, isFundador: false,
          nivelCargo: "B", faixaSalarial: "INICIAL" },
      ],
      resultados: [{ unidadeCodigo: "DSF", isMatriz: true, lucroLiquido: 1_000_000 }],
      premissas: premissasBase,
    });
    const ricardo = r.pacotes.find((p) => p.socioId === "ric")!;
    const outro = r.pacotes.find((p) => p.socioId === "out")!;
    expect(ricardo.blocoC).toBe(120_000);
    expect(outro.blocoC).toBe(0);
    // totalBlocoC = 20% × 1M = 200k; reserva = 200k − 120k = 80k.
    expect(r.totalReservaCentral).toBeCloseTo(80_000, 1);
    // Trace tem etapa 9.bloco-C com valor manual.
    const t = ricardo.trace.find((x) => x.etapa === "9.bloco-C");
    expect(t).toBeDefined();
    expect(t!.valor).toBe(120_000);
  });

  it("manual em período TRIMESTRE: pro-rata × meses/12", () => {
    const r = calcularModeloNovo({
      periodo: { rotulo: "1T2026", tipo: "TRIMESTRE", meses: 3 },
      socios: [
        { id: "ric", nome: "Ricardo", cargo: "Diretor", publico: "SOCIO_CAPITAL_GESTOR",
          percentualQuotas: 1.0, originacaoEsperadaAnual: 0, isFundador: false,
          nivelCargo: "B", faixaSalarial: "INICIAL",
          blocoCValorManualAno: 120_000 },
      ],
      resultados: [{ unidadeCodigo: "DSF", isMatriz: true, lucroLiquido: 1_000_000 }],
      premissas: premissasBase,
    });
    // 120.000 × 3/12 = 30.000
    expect(r.pacotes[0].blocoC).toBe(30_000);
  });

  it("alvo Bloco B NÃO afeta Bloco C (regras independentes)", () => {
    // Sócio com alvo B=20 mas SEM manual de C → recebe Bloco B mas C=0.
    const r = calcularModeloNovo({
      periodo: { rotulo: "2026", tipo: "ANO", meses: 12 },
      socios: [
        { id: "a", nome: "A", cargo: "X", publico: "SOCIO_CAPITAL_GESTOR",
          percentualQuotas: 0.5, originacaoEsperadaAnual: 0, isFundador: false,
          nivelCargo: "B", faixaSalarial: "INICIAL", blocoBNumSalariosAlvo: 20 },
        // Outro com manual C explícito mas sem alvo B → C=manual, B=0.
        { id: "b", nome: "B", cargo: "X", publico: "SOCIO_CAPITAL_GESTOR",
          percentualQuotas: 0.5, originacaoEsperadaAnual: 0, isFundador: false,
          nivelCargo: "B", faixaSalarial: "INICIAL",
          blocoCValorManualAno: 50_000 },
      ],
      resultados: [{ unidadeCodigo: "DSF", isMatriz: true, lucroLiquido: 10_000_000 }],
      premissas: premissasBase,
    });
    const a = r.pacotes.find((p) => p.socioId === "a")!;
    const b = r.pacotes.find((p) => p.socioId === "b")!;
    // a: alvo B=20 × base 13000 = 260.000; sem C.
    expect(a.blocoB).toBeCloseTo(260_000, 1);
    expect(a.blocoC).toBe(0);
    // b: sem alvo B = 0; C = manual.
    expect(b.blocoB).toBe(0);
    expect(b.blocoC).toBe(50_000);
  });

  it("Σ manuais excede totalBlocoC: paga integral + alerta global; reserva clamped em 0", () => {
    // RDA pequeno: totalBlocoC = 20% × 500k = 100k. Manual de 200k estoura.
    const r = calcularModeloNovo({
      periodo: { rotulo: "2026", tipo: "ANO", meses: 12 },
      socios: [
        { id: "a", nome: "A", cargo: "X", publico: "SOCIO_CAPITAL_GESTOR",
          percentualQuotas: 1.0, originacaoEsperadaAnual: 0, isFundador: false,
          nivelCargo: "A", faixaSalarial: "INICIAL",
          blocoCValorManualAno: 200_000 },
      ],
      resultados: [{ unidadeCodigo: "DSF", isMatriz: true, lucroLiquido: 500_000 }],
      premissas: premissasBase,
    });
    // Engine paga integralmente (deliberação vincula); reserva clamped em 0.
    expect(r.pacotes[0].blocoC).toBe(200_000);
    expect(r.totalReservaCentral).toBe(0);
    // Alerta global emitido.
    expect(r.alertasGlobais.some((m) => /Bloco C.*excede/i.test(m))).toBe(true);
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
      premissas: premissasBase,
    });
    // Bloco A = 45% × 8M = 3,6M (sem deduzir admin)
    expect(r.pacotes[0].blocoA).toBeCloseTo(3_600_000, 0);
  });
});
