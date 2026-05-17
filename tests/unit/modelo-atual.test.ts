import { describe, it, expect } from "vitest";
import { calcularModeloAtual } from "@/lib/domain/dsf/modelo-atual";
import type { InputModeloAtual, TabelaSalarial } from "@/lib/domain/dsf/tipos";

const tabela: TabelaSalarial = {
  A: { INICIAL: 9600, PLENO: 12000, EXPERT: 14400 },
  B: { INICIAL: 8000, PLENO: 10000, EXPERT: 12000 },
  C: { INICIAL: 6400, PLENO: 8000, EXPERT: 9600 },
  D: { INICIAL: 5600, PLENO: 7000, EXPERT: 8400 },
};

const premissasBase = {
  proLaboreMensal: 5000,
  unidadeFundadores: "BG",
  unidadeMatriz: "DSF",
  reservaPercentual: 0.05,
  reservaViraPremio: true,
  tabelaSalarial: tabela,
};

describe("Modelo ATUAL — componentes individuais", () => {
  it("pró-labore trimestral fixo de R$ 15.000 (5k × 3 meses)", () => {
    const input: InputModeloAtual = {
      periodo: { rotulo: "1T2026", tipo: "TRIMESTRE", meses: 3 },
      socios: [{
        id: "s1", nome: "Alessandro", cargo: "CEO", publico: "SOCIO_CAPITAL_GESTOR",
        percentualQuotas: 0.13184, originacaoEsperadaAnual: 0,
        nivelCargo: "A", faixaSalarial: "INICIAL", isFundador: false,
      }],
      resultados: [
        { unidadeCodigo: "DSF", isMatriz: true, lucroLiquido: 1394712.16 },
        { unidadeCodigo: "BG", isMatriz: false, lucroLiquido: 1041022.54, fundingVariavel: 881598 },
      ],
      premissas: premissasBase,
    };
    const r = calcularModeloAtual(input);
    expect(r.pacotes[0].proLabore).toBe(15000);
    expect(r.pacotes[0].remuneracaoGestao).toBe(28800); // 9600 × 3
  });

  it("fundadores recebem valorDiscricionario por sócio (BRL fixo)", () => {
    const input: InputModeloAtual = {
      periodo: { rotulo: "1T2026", tipo: "TRIMESTRE", meses: 3 },
      socios: [
        { id: "f1", nome: "Décio", cargo: "Fundador", publico: "FUNDADOR",
          percentualQuotas: 0.14871, originacaoEsperadaAnual: 0, isFundador: true,
          fundingFundadorAnual: 131102.46 },
        { id: "f2", nome: "Gilberto", cargo: "Fundador", publico: "FUNDADOR",
          percentualQuotas: 0.14871, originacaoEsperadaAnual: 0, isFundador: true,
          fundingFundadorAnual: 131102.46 },
      ],
      resultados: [
        { unidadeCodigo: "DSF", isMatriz: true, lucroLiquido: 1394712.16 },
        { unidadeCodigo: "BG", isMatriz: false, lucroLiquido: 1041022.54, fundingVariavel: 881598 },
      ],
      premissas: premissasBase,
    };
    const r = calcularModeloAtual(input);
    expect(r.pacotes[0].remuneracaoFundador).toBeCloseTo(131102.46, 1);
    expect(r.pacotes[1].remuneracaoFundador).toBeCloseTo(131102.46, 1);
  });

  it("funding DSF residual desconta fundadores; reserva = 5% sobre residual", () => {
    const input: InputModeloAtual = {
      periodo: { rotulo: "1T2026", tipo: "TRIMESTRE", meses: 3 },
      socios: [
        { id: "f1", nome: "Décio", cargo: "Fundador", publico: "FUNDADOR",
          percentualQuotas: 0.14871, originacaoEsperadaAnual: 0, isFundador: true,
          fundingFundadorAnual: 131102.46 },
        { id: "f2", nome: "Gilberto", cargo: "Fundador", publico: "FUNDADOR",
          percentualQuotas: 0.14871, originacaoEsperadaAnual: 0, isFundador: true,
          fundingFundadorAnual: 131102.46 },
      ],
      resultados: [
        { unidadeCodigo: "DSF", isMatriz: true, lucroLiquido: 1394712.16 },
        { unidadeCodigo: "BG", isMatriz: false, lucroLiquido: 1041022.54, fundingVariavel: 881598 },
      ],
      premissas: { ...premissasBase, reservaViraPremio: false },
    };
    const r = calcularModeloAtual(input);
    // Funding DSF = 1394712.16 − 2 × 131102.46 = 1132507.24
    // Reserva = 1132507.24 × 0.05 = 56625.36
    expect(r.totalReservaCentral).toBeCloseTo(56625.36, 1);
  });
});
