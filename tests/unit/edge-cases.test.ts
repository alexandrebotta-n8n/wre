// Edge cases não cobertos pelos testes principais (paridade-1t2026 + distribuicao).
//
// Critérios de inclusão:
//   - Cenários degenerados que poderiam crashar mas devem retornar 0/vazio limpo.
//   - Mecanismos pouco exercitados em outros testes (Bloco C reserva, Comissão
//     Originação, Pool Unidade, overrides individuais).
//   - Pré-condições do engine (unidadeMatriz ausente → throw claro).
import { describe, it, expect } from "vitest";
import { calcularModeloAtual } from "@/lib/domain/dsf/modelo-atual";
import { calcularModeloNovo } from "@/lib/domain/dsf/modelo-novo";
import type {
  TabelaSalarial, SocioInput,
  PremissasModeloAtual, PremissasModeloNovo,
} from "@/lib/domain/dsf/tipos";

const tabela: TabelaSalarial = {
  A: { INICIAL: 9600, PLENO: 12000, EXPERT: 14400 },
  B: { INICIAL: 8000, PLENO: 10000, EXPERT: 12000 },
  C: { INICIAL: 6400, PLENO: 8000, EXPERT: 9600 },
  D: { INICIAL: 5600, PLENO: 7000, EXPERT: 8400 },
};

const periodoAno = { rotulo: "2026", tipo: "ANO" as const, meses: 12 };

const baseNovo: PremissasModeloNovo = {
  percentualBlocoA: 0.45, percentualBlocoB: 0.35, percentualBlocoC: 0.20,
  poolSociedade: 0.50, poolLider: 0.30, poolEquipeReserva: 0.20,
  chaveOriginacao: 0.30, chaveExecucao: 0.60, chaveGestaoCP: 0.10,
  faixaOrigMin: 0.20, faixaOrigMax: 0.40,
  faixaExecMin: 0.50, faixaExecMax: 0.70,
  faixaGestaoMin: 0.00, faixaGestaoMax: 0.15,
  tabelaSalarial: tabela,
};

const baseAtual: PremissasModeloAtual = {
  proLaboreMensal: 5000,
  unidadeMatriz: "DSF",
  reservaPercentual: 0.05,
  reservaViraPremio: true,
  fundingFundadoresAno: 0, // deprecated mas no schema
  tabelaSalarial: tabela,
};

// ============================================================================
// Bloco C — reserva estratégica retida (20% do RDA, não distribuída no MVP)
// ============================================================================

describe("Modelo NOVO — Bloco C como reserva estratégica", () => {
  it("totalReservaCentral = 20% do RDA, nenhum sócio recebe blocoC", () => {
    const socios: SocioInput[] = [
      { id: "s1", nome: "S1", cargo: "Sócio", publico: "SOCIO_CAPITAL",
        percentualQuotas: 0.5, originacaoEsperadaAnual: 0, isFundador: false },
      { id: "s2", nome: "S2", cargo: "Sócio", publico: "SOCIO_CAPITAL",
        percentualQuotas: 0.5, originacaoEsperadaAnual: 0, isFundador: false },
    ];
    const r = calcularModeloNovo({
      periodo: periodoAno, socios,
      resultados: [{ unidadeCodigo: "DSF", isMatriz: true, lucroLiquido: 1_000_000 }],
      premissas: baseNovo,
    });
    // RDA = 1M (sem admin, sem fundadores), Bloco C = 200k retido.
    expect(r.totalReservaCentral).toBeCloseTo(200_000, 1);
    // Nenhum pacote individual ganha blocoC (não é distribuído).
    for (const p of r.pacotes) expect(p.blocoC).toBe(0);
  });
});

// ============================================================================
// Comissão de Originação — taxa × valor originado
// ============================================================================

describe("Modelo NOVO — Comissão de Originação", () => {
  it("creditoOriginacao = taxa × originacaoEfetiva", () => {
    const socios: SocioInput[] = [
      { id: "orig", nome: "Originador", cargo: "Sócio", publico: "SOCIO_CAPITAL",
        percentualQuotas: 0.5, originacaoEsperadaAnual: 0,
        originacaoEfetiva: 800_000, isFundador: false },
      { id: "outro", nome: "Outro", cargo: "Sócio", publico: "SOCIO_CAPITAL",
        percentualQuotas: 0.5, originacaoEsperadaAnual: 0, isFundador: false },
    ];
    const r = calcularModeloNovo({
      periodo: periodoAno, socios,
      resultados: [{ unidadeCodigo: "DSF", isMatriz: true, lucroLiquido: 5_000_000 }],
      premissas: { ...baseNovo, taxaComissaoOriginacao: 0.05 },
    });
    const orig = r.pacotes.find((p) => p.socioId === "orig")!;
    const outro = r.pacotes.find((p) => p.socioId === "outro")!;
    expect(orig.creditoOriginacao).toBeCloseTo(800_000 * 0.05, 1);
    expect(outro.creditoOriginacao).toBe(0); // sem originação efetiva
  });

  it("taxa=0 desliga comissão (default)", () => {
    const socios: SocioInput[] = [
      { id: "s", nome: "S", cargo: "Sócio", publico: "SOCIO_CAPITAL",
        percentualQuotas: 1, originacaoEsperadaAnual: 0,
        originacaoEfetiva: 1_000_000, isFundador: false },
    ];
    const r = calcularModeloNovo({
      periodo: periodoAno, socios,
      resultados: [{ unidadeCodigo: "DSF", isMatriz: true, lucroLiquido: 1_000_000 }],
      premissas: baseNovo, // sem taxaComissaoOriginacao
    });
    expect(r.pacotes[0].creditoOriginacao).toBe(0);
  });
});

// ============================================================================
// Pool Unidade — líder de unidade recebe 30% do LL_unidade
// ============================================================================

describe("Modelo NOVO — Pool da Unidade (líder recebe 30%)", () => {
  it("SOCIO_CAPITAL_LIDER_UNIDADE recebe poolLider × LL_unidade", () => {
    const socios: SocioInput[] = [
      { id: "lider", nome: "Líder BG", cargo: "Líder", publico: "SOCIO_CAPITAL_LIDER_UNIDADE",
        percentualQuotas: 0.1, originacaoEsperadaAnual: 0,
        unidadeCodigo: "BG", isFundador: false },
      { id: "socio", nome: "Sócio DSF", cargo: "Sócio", publico: "SOCIO_CAPITAL",
        percentualQuotas: 0.9, originacaoEsperadaAnual: 0, isFundador: false },
    ];
    const r = calcularModeloNovo({
      periodo: periodoAno, socios,
      resultados: [
        { unidadeCodigo: "DSF", isMatriz: true, lucroLiquido: 1_000_000 },
        { unidadeCodigo: "BG", isMatriz: false, lucroLiquido: 500_000 },
      ],
      premissas: baseNovo,
    });
    const lider = r.pacotes.find((p) => p.socioId === "lider")!;
    // Pool líder = 0.30 × 500.000 = 150.000
    expect(lider.poolUnidade).toBeCloseTo(150_000, 1);
  });

  it("LIDER_UNIDADE_NON_EQUITY recebe pool mas não Bloco A/B", () => {
    const socios: SocioInput[] = [
      { id: "ne", nome: "Líder NE", cargo: "Líder", publico: "LIDER_UNIDADE_NON_EQUITY",
        percentualQuotas: 0, originacaoEsperadaAnual: 0,
        unidadeCodigo: "BG", isFundador: false },
    ];
    const r = calcularModeloNovo({
      periodo: periodoAno, socios,
      resultados: [
        { unidadeCodigo: "DSF", isMatriz: true, lucroLiquido: 1_000_000 },
        { unidadeCodigo: "BG", isMatriz: false, lucroLiquido: 400_000 },
      ],
      premissas: baseNovo,
    });
    const ne = r.pacotes[0];
    expect(ne.poolUnidade).toBeCloseTo(120_000, 1); // 0.30 × 400k
    expect(ne.blocoA).toBe(0); // non-equity não recebe A
    expect(ne.blocoB).toBe(0); // matriz oficial exclui non-equity de B
  });
});

// ============================================================================
// Cenários degenerados
// ============================================================================

describe("Modelo NOVO — cenário 100% fundadores (sem não-fund)", () => {
  it("fundadores no NOVO recebem ZERO em tudo (engine NOVO ignora fundingFundadorAnual)", () => {
    // Política DSF v1: fundadores "Não considerar" — engine NOVO ignora
    // fundingFundadorAnual (planilha de/para confirma). Campo continua
    // existindo no Socio e alimenta APENAS o engine ATUAL.
    const socios: SocioInput[] = [
      { id: "f1", nome: "F1", cargo: "Fund", publico: "FUNDADOR",
        percentualQuotas: 0.5, originacaoEsperadaAnual: 0, isFundador: true,
        fundingFundadorAnual: 100_000 },
      { id: "f2", nome: "F2", cargo: "Fund", publico: "FUNDADOR",
        percentualQuotas: 0.5, originacaoEsperadaAnual: 0, isFundador: true,
        fundingFundadorAnual: 100_000 },
    ];
    const r = calcularModeloNovo({
      periodo: periodoAno, socios,
      resultados: [{ unidadeCodigo: "DSF", isMatriz: true, lucroLiquido: 1_000_000 }],
      premissas: baseNovo,
    });
    for (const p of r.pacotes) {
      expect(p.remuneracaoFundador).toBe(0);
      expect(p.blocoA).toBe(0);
      expect(p.blocoB).toBe(0);
      expect(p.total).toBe(0);
    }
    expect(r.totalDistribuido).toBe(0);
  });
});

describe("Modelo NOVO — sócio sem nivelCargo/faixaSalarial (rem.admin = 0)", () => {
  it("não crasha; remuneracaoGestao = 0 quando faltam nivel/faixa", () => {
    const socios: SocioInput[] = [
      { id: "s", nome: "S", cargo: "Sócio", publico: "SOCIO_CAPITAL_GESTOR",
        percentualQuotas: 1, originacaoEsperadaAnual: 0, isFundador: false,
        // sem nivelCargo nem faixaSalarial
      },
    ];
    const r = calcularModeloNovo({
      periodo: periodoAno, socios,
      resultados: [{ unidadeCodigo: "DSF", isMatriz: true, lucroLiquido: 1_000_000 }],
      premissas: baseNovo,
    });
    expect(r.pacotes[0].remuneracaoGestao).toBe(0);
    // Mas continua recebendo Bloco A normalmente.
    expect(r.pacotes[0].blocoA).toBeGreaterThan(0);
  });
});

// ============================================================================
// Overrides individuais — Socio.proLaboreMensal > Premissa.proLaboreMensal
// ============================================================================

describe("Overrides individuais", () => {
  it("ATUAL: proLaboreMensalOverride sobrescreve premissa global", () => {
    const socios: SocioInput[] = [
      { id: "padrao", nome: "Padrão", cargo: "Sócio", publico: "SOCIO_CAPITAL_GESTOR",
        percentualQuotas: 0.5, originacaoEsperadaAnual: 0, isFundador: false,
        nivelCargo: "A", faixaSalarial: "INICIAL" },
      { id: "vip", nome: "VIP", cargo: "Sócio", publico: "SOCIO_CAPITAL_GESTOR",
        percentualQuotas: 0.5, originacaoEsperadaAnual: 0, isFundador: false,
        nivelCargo: "A", faixaSalarial: "INICIAL",
        proLaboreMensalOverride: 20_000 },
    ];
    const r = calcularModeloAtual({
      periodo: periodoAno, socios,
      resultados: [{ unidadeCodigo: "DSF", isMatriz: true, lucroLiquido: 1_000_000 }],
      premissas: baseAtual, // proLaboreMensal = 5000
    });
    const padrao = r.pacotes.find((p) => p.socioId === "padrao")!;
    const vip = r.pacotes.find((p) => p.socioId === "vip")!;
    expect(padrao.proLabore).toBe(5_000 * 12); // 60k anual
    expect(vip.proLabore).toBe(20_000 * 12);   // 240k anual (override)
  });

  it("NOVO: remuneracaoGestaoMensalOverride sobrescreve tabela", () => {
    const socios: SocioInput[] = [
      { id: "padrao", nome: "Padrão", cargo: "Sócio", publico: "SOCIO_CAPITAL_GESTOR",
        percentualQuotas: 0.5, originacaoEsperadaAnual: 0, isFundador: false,
        nivelCargo: "A", faixaSalarial: "INICIAL" }, // 9600 × 12 = 115.200
      { id: "alto", nome: "Alto", cargo: "Sócio", publico: "SOCIO_CAPITAL_GESTOR",
        percentualQuotas: 0.5, originacaoEsperadaAnual: 0, isFundador: false,
        nivelCargo: "A", faixaSalarial: "INICIAL",
        remuneracaoGestaoMensalOverride: 25_000 }, // 25k × 12 = 300.000
    ];
    const r = calcularModeloNovo({
      periodo: periodoAno, socios,
      resultados: [{ unidadeCodigo: "DSF", isMatriz: true, lucroLiquido: 5_000_000 }],
      premissas: baseNovo,
    });
    const padrao = r.pacotes.find((p) => p.socioId === "padrao")!;
    const alto = r.pacotes.find((p) => p.socioId === "alto")!;
    expect(padrao.remuneracaoGestao).toBe(9600 * 12);
    expect(alto.remuneracaoGestao).toBe(25_000 * 12);
  });
});

// ============================================================================
// Pré-condições do engine
// ============================================================================

describe("Engine — pré-condições falham cedo", () => {
  it("ATUAL: throw se unidadeMatriz não está em resultados", () => {
    const socios: SocioInput[] = [
      { id: "s", nome: "S", cargo: "Sócio", publico: "SOCIO_CAPITAL_GESTOR",
        percentualQuotas: 1, originacaoEsperadaAnual: 0, isFundador: false,
        nivelCargo: "A", faixaSalarial: "INICIAL" },
    ];
    expect(() =>
      calcularModeloAtual({
        periodo: periodoAno,
        socios,
        // Resultado da unidade BG, mas premissa pede DSF — deve throwear.
        resultados: [{ unidadeCodigo: "BG", isMatriz: false, lucroLiquido: 500_000 }],
        premissas: baseAtual,
      }),
    ).toThrow(/unidade matriz/i);
  });

  it("ATUAL: aceita sem resultados (caso de teste/cenário vazio)", () => {
    // Quando resultados=[], o engine deve apenas calcular pro-labore/gestão
    // sem distribuir nada (LL=0). Não throw.
    const socios: SocioInput[] = [
      { id: "s", nome: "S", cargo: "Sócio", publico: "SOCIO_CAPITAL_GESTOR",
        percentualQuotas: 1, originacaoEsperadaAnual: 0, isFundador: false,
        nivelCargo: "A", faixaSalarial: "INICIAL" },
    ];
    const r = calcularModeloAtual({
      periodo: periodoAno,
      socios,
      resultados: [],
      premissas: baseAtual,
    });
    expect(r.pacotes[0].blocoB).toBe(0);
    expect(r.pacotes[0].proLabore).toBe(5000 * 12);
  });
});

// ============================================================================
// Modo REDISTRIBUIDA — quotas zeradas pra fundadores/serviços, capital absorve
// (helper redistribuirQuotas + engine consumindo SocioInput pré-processado).
// ============================================================================

describe("Modo REDISTRIBUIDA — engine consome quotas pré-redistribuídas", () => {
  it("ATUAL: distribuição residual usa quotas redistribuídas; total inalterado", () => {
    // 1 capital com quota original 50% e 1 capital com 50%. Sem fundadores/serv.
    // Cenário A: modo ORIGINAL → 50%/50% direto.
    // Cenário B: 1 fundador 30% + 1 serv 10% + 1 capital 30% + 1 capital 30%
    //            ORIGINAL: capitais recebem 30/60 = 50% cada (do funding × 0.95).
    //            REDISTRIBUIDA: quotas fundador=0, serv=0, capitais sobem
    //            (30+30+10+30)=100% → cada cap recebe 50% também → MESMO total
    //            pq o engine ATUAL já exclui fundadores; mas a diferença está
    //            no peso do SOCIO_SERVICOS (que ANTES recebia, AGORA não).
    //
    // Em vez disso, validar que: modo REDIS muda a divisão entre capitais
    // QUANDO eles têm quotas desiguais.
    const sociosRedist: SocioInput[] = [
      // Fundador: zera; mesmo cadastro como SOCIO_CAPITAL.
      { id: "fund", nome: "F", cargo: "Fund", publico: "SOCIO_CAPITAL",
        percentualQuotas: 0, originacaoEsperadaAnual: 0, isFundador: true,
        fundingFundadorAnual: 100_000 },
      // Capital A: original 30% → redistribuído (30 + 30) / 60 × 30 = 30% (sozinho com B)
      // Wait: 2 capitais original 30%/30%, fundador 30%, serviços 10% → soma cap = 60%
      // Redistrib: cada cap recebe 30 × (60+40)/60 = 50%.
      { id: "ca", nome: "Cap A", cargo: "Sócio", publico: "SOCIO_CAPITAL",
        percentualQuotas: 0.50, originacaoEsperadaAnual: 0, isFundador: false },
      { id: "cb", nome: "Cap B", cargo: "Sócio", publico: "SOCIO_CAPITAL",
        percentualQuotas: 0.50, originacaoEsperadaAnual: 0, isFundador: false },
    ];
    // Esses SocioInputs já estão com quotas FINAIS (simula o que o service
    // teria passado quando modoQuotas=REDISTRIBUIDA). Engine consome sem
    // saber de modo — testa que o consumo funciona.
    const r = calcularModeloAtual({
      periodo: periodoAno, socios: sociosRedist,
      resultados: [{ unidadeCodigo: "DSF", isMatriz: true, lucroLiquido: 1_000_000 }],
      premissas: baseAtual,
    });
    // Soma de quotas não-fund = 1.0 → distribuição residual rateia tudo entre A+B.
    // funding residual = 1M - 100k (funding fund) = 900k. Distribuível = 900k × 0.95 = 855k.
    // Cada cap recebe (0.5/1.0) × 855k = 427.5k.
    const ca = r.pacotes.find((p) => p.socioId === "ca")!;
    const cb = r.pacotes.find((p) => p.socioId === "cb")!;
    expect(ca.blocoB).toBeCloseTo(427_500, 1);
    expect(cb.blocoB).toBeCloseTo(427_500, 1);
    // Fundador recebe só funding individual (100k), zero da distribuição.
    const fund = r.pacotes.find((p) => p.socioId === "fund")!;
    expect(fund.blocoB).toBe(0);
    expect(fund.remuneracaoFundador).toBe(100_000);
  });

  it("NOVO: Bloco A usa quotas redistribuídas (capital remanescente absorve)", () => {
    // 1 capital 60% + 1 serviços (redistribuído pra 0) → cap recebe 100% do Bloco A
    // simulado: SocioInput vindo já com quotas finais (cap=1.0, serv=0).
    const sociosRedist: SocioInput[] = [
      { id: "cap", nome: "Cap", cargo: "Sócio", publico: "SOCIO_CAPITAL",
        percentualQuotas: 1.0, originacaoEsperadaAnual: 0, isFundador: false },
      { id: "serv", nome: "Serv", cargo: "Sócio Serv.", publico: "SOCIO_SERVICOS",
        percentualQuotas: 0, originacaoEsperadaAnual: 0, isFundador: false },
    ];
    const r = calcularModeloNovo({
      periodo: periodoAno, socios: sociosRedist,
      resultados: [{ unidadeCodigo: "DSF", isMatriz: true, lucroLiquido: 1_000_000 }],
      premissas: baseNovo,
    });
    const cap = r.pacotes.find((p) => p.socioId === "cap")!;
    const serv = r.pacotes.find((p) => p.socioId === "serv")!;
    // RDA = 1M. Bloco A = 45% = 450k. Cap sozinho na base → recebe tudo.
    expect(cap.blocoA).toBeCloseTo(450_000, 1);
    // Serv: publico SOCIO_SERVICOS NÃO é capital → não entra em Bloco A
    // (engine NOVO já filtra por PUBLICOS_CAPITAL). Quota=0 reforça.
    expect(serv.blocoA).toBe(0);
  });
});
