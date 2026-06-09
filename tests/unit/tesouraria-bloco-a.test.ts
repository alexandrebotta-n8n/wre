// Engine NOVO — Tesouraria de quotas reservadas.
//
// Regra (decisão de negócio): as quotas de fundadores e Sócios de Serviço NÃO
// são redistribuídas entre os sócios de capital remanescentes. O Bloco A é
// rateado DIRETO pela quota original (fração de 100%); a fatia correspondente
// às quotas reservadas fica RETIDA em tesouraria (`tesourariaBlocoA`).
import { describe, it, expect } from "vitest";
import { calcularModeloNovo } from "@/lib/domain/dsf/modelo-novo";
import type { TabelaSalarial, SocioInput, PremissasModeloNovo } from "@/lib/domain/dsf";

const tabela: TabelaSalarial = {
  A: { INICIAL: 9600, PLENO: 12000, EXPERT: 14400 },
  B: { INICIAL: 8000, PLENO: 10000, EXPERT: 12000 },
  C: { INICIAL: 6400, PLENO: 8000, EXPERT: 9600 },
  D: { INICIAL: 5600, PLENO: 7000, EXPERT: 8400 },
};

const premissas: PremissasModeloNovo = {
  percentualBlocoA: 0.45, percentualBlocoB: 0.35, percentualBlocoC: 0.20,
  poolSociedade: 0.50, poolLider: 0.30, poolEquipeReserva: 0.20,
  chaveOriginacao: 0.30, chaveExecucao: 0.60, chaveGestaoCP: 0.10,
  faixaOrigMin: 0.20, faixaOrigMax: 0.40,
  faixaExecMin: 0.50, faixaExecMax: 0.70,
  faixaGestaoMin: 0.00, faixaGestaoMax: 0.15,
  tabelaSalarial: tabela,
};

const periodo = { rotulo: "2026", tipo: "ANO" as const, meses: 12 };
const resultados = [{ unidadeCodigo: "DSF", isMatriz: true, lucroLiquido: 1_000_000 }];

describe("Modelo NOVO — Tesouraria de quotas reservadas", () => {
  it("fundador + serviço reservados; capitais recebem só a própria quota", () => {
    // Cap table soma 100%: fundador 30% + serviço 10% (reservados) +
    // 2 capitais 30% + 30% (recebem). RDA = 1M, Bloco A = 450k.
    const socios: SocioInput[] = [
      { id: "fund", nome: "Fundador", cargo: "Fund", publico: "SOCIO_CAPITAL",
        percentualQuotas: 0.30, originacaoEsperadaAnual: 0, isFundador: true },
      { id: "serv", nome: "Serviço", cargo: "Sócio Serv.", publico: "SOCIO_SERVICOS",
        percentualQuotas: 0.10, originacaoEsperadaAnual: 0, isFundador: false },
      { id: "c1", nome: "Capital 1", cargo: "Sócio", publico: "SOCIO_CAPITAL",
        percentualQuotas: 0.30, originacaoEsperadaAnual: 0, isFundador: false },
      { id: "c2", nome: "Capital 2", cargo: "Sócio", publico: "SOCIO_CAPITAL",
        percentualQuotas: 0.30, originacaoEsperadaAnual: 0, isFundador: false },
    ];
    const r = calcularModeloNovo({ periodo, socios, resultados, premissas });
    const c1 = r.pacotes.find((p) => p.socioId === "c1")!;
    const c2 = r.pacotes.find((p) => p.socioId === "c2")!;
    const fund = r.pacotes.find((p) => p.socioId === "fund")!;
    const serv = r.pacotes.find((p) => p.socioId === "serv")!;

    // Cada capital recebe 0.30 × 450k = 135k (rateio DIRETO, sem absorver).
    expect(c1.blocoA).toBeCloseTo(135_000, 1);
    expect(c2.blocoA).toBeCloseTo(135_000, 1);
    // Fundador e serviço não recebem Bloco A.
    expect(fund.blocoA).toBe(0);
    expect(serv.blocoA).toBe(0);
    // Reservado: fundador 0.30 + serviço 0.10 = 0.40.
    expect(r.quotasReservadasTesouraria).toBeCloseTo(0.40, 6);
    // Tesouraria = 450k − 270k = 180k (= 0.40 × 450k).
    expect(r.tesourariaBlocoA).toBeCloseTo(180_000, 1);
    // Sanity: distribuído + tesouraria = totalBlocoA.
    expect(c1.blocoA + c2.blocoA + r.tesourariaBlocoA).toBeCloseTo(450_000, 1);
    // Sem alerta de excesso.
    expect(r.alertasGlobais.some((m) => /Bloco A distribuído/i.test(m))).toBe(false);
  });

  it("SOCIO_SERVICOS_ESTRATEGICO mantém quota ativa (não vai pra tesouraria)", () => {
    const socios: SocioInput[] = [
      { id: "estr", nome: "Estratégico", cargo: "Sócio", publico: "SOCIO_SERVICOS_ESTRATEGICO",
        percentualQuotas: 0.20, originacaoEsperadaAnual: 0, isFundador: false },
      { id: "cap", nome: "Capital", cargo: "Sócio", publico: "SOCIO_CAPITAL",
        percentualQuotas: 0.80, originacaoEsperadaAnual: 0, isFundador: false },
    ];
    const r = calcularModeloNovo({ periodo, socios, resultados, premissas });
    // Estratégico não é "reservado"; sua quota não conta na tesouraria.
    expect(r.quotasReservadasTesouraria).toBe(0);
    // Estratégico não é capital → não recebe Bloco A; sua fatia (0.20) fica
    // retida porque o capital só recebe a própria quota (0.80 × 450k = 360k).
    const cap = r.pacotes.find((p) => p.socioId === "cap")!;
    expect(cap.blocoA).toBeCloseTo(360_000, 1);
    expect(r.tesourariaBlocoA).toBeCloseTo(90_000, 1); // 450k − 360k
  });

  it("capitais somando > 100% (erro de cadastro) → clamp em 0 + alerta", () => {
    const socios: SocioInput[] = [
      { id: "c1", nome: "C1", cargo: "Sócio", publico: "SOCIO_CAPITAL",
        percentualQuotas: 0.60, originacaoEsperadaAnual: 0, isFundador: false },
      { id: "c2", nome: "C2", cargo: "Sócio", publico: "SOCIO_CAPITAL",
        percentualQuotas: 0.60, originacaoEsperadaAnual: 0, isFundador: false },
    ];
    const r = calcularModeloNovo({ periodo, socios, resultados, premissas });
    // Σ distribuído = 1.20 × 450k = 540k > 450k → tesouraria clamped em 0.
    expect(r.tesourariaBlocoA).toBe(0);
    expect(r.alertasGlobais.some((m) => /Bloco A distribuído.*excede/i.test(m))).toBe(true);
  });
});
