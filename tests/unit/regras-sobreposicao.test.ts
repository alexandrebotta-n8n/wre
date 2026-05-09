import { describe, it, expect } from "vitest";
import { validarSobreposicao } from "@/lib/domain/dsf/regras-sobreposicao";
import type { PacoteRemuneracao } from "@/lib/domain/dsf/tipos";

const pacoteVazio = (): PacoteRemuneracao => ({
  socioId: "s1", socioNome: "X", publico: "SOCIO_CAPITAL",
  proLabore: 0, remuneracaoGestao: 0, remuneracaoFundador: 0,
  blocoA: 0, blocoB: 0, blocoC: 0, poolUnidade: 0,
  creditoOriginacao: 0, creditoExecucao: 0, creditoGestaoCP: 0,
  ajustes: 0, total: 0, alertasNaoSobreposicao: [], trace: [],
});

describe("validarSobreposicao", () => {
  it("ERROR quando Bloco A vai para Sócio de Serviços", () => {
    const p = { ...pacoteVazio(), blocoA: 1000 };
    const a = validarSobreposicao("SOCIO_SERVICOS", p);
    expect(a.find((x) => x.codigo === "BLOCO_A_NON_EQUITY")?.severidade).toBe("ERROR");
  });

  it("WARNING quando Bloco B + Pool de Unidade no mesmo pacote", () => {
    const p = { ...pacoteVazio(), blocoB: 1000, poolUnidade: 500 };
    const a = validarSobreposicao("SOCIO_CAPITAL_LIDER_UNIDADE", p);
    expect(a.find((x) => x.codigo === "BLOCO_B_POOL_DUPLO")?.severidade).toBe("WARNING");
  });

  it("ERROR quando Pool de Unidade sem liderança formal", () => {
    const p = { ...pacoteVazio(), poolUnidade: 1000 };
    const a = validarSobreposicao("SOCIO_CAPITAL", p);
    expect(a.find((x) => x.codigo === "POOL_SEM_LIDERANCA")?.severidade).toBe("ERROR");
  });

  it("INFO informativo quando Bloco C aplicado", () => {
    const p = { ...pacoteVazio(), blocoC: 1000 };
    const a = validarSobreposicao("SOCIO_CAPITAL", p);
    expect(a.find((x) => x.codigo === "BLOCO_C_EXCEPCIONAL")?.severidade).toBe("INFO");
  });

  it("WARNING para remuneração de gestão sem função formal", () => {
    const p = { ...pacoteVazio(), remuneracaoGestao: 1000 };
    const a = validarSobreposicao("SOCIO_CAPITAL", p);
    expect(a.find((x) => x.codigo === "GESTAO_SEM_FUNCAO")?.severidade).toBe("WARNING");
  });

  it("sem alertas para Sócio de Capital com apenas Bloco A + B", () => {
    const p = { ...pacoteVazio(), blocoA: 1000, blocoB: 500 };
    const a = validarSobreposicao("SOCIO_CAPITAL", p);
    expect(a).toHaveLength(0);
  });
});
