import { describe, it, expect } from "vitest";
import { multiplicadorKpi, multiplicadorComposto, proRata } from "@/lib/domain/calc";

const curva = { metaMin: 100, metaEsp: 150, metaExc: 200, multMin: 0.5, multEsp: 1.0, multExc: 1.5 };

describe("multiplicadorKpi (curva normal)", () => {
  it("retorna 0 abaixo do min", () => {
    expect(multiplicadorKpi(50, curva)).toBe(0);
  });
  it("interpola entre min e esp", () => {
    expect(multiplicadorKpi(125, curva)).toBeCloseTo(0.75);
  });
  it("retorna multEsp na meta", () => {
    expect(multiplicadorKpi(150, curva)).toBeCloseTo(1.0);
  });
  it("interpola entre esp e exc", () => {
    expect(multiplicadorKpi(175, curva)).toBeCloseTo(1.25);
  });
  it("clamp no exc (sem extrapolação)", () => {
    expect(multiplicadorKpi(500, curva)).toBe(1.5);
  });
});

describe("multiplicadorKpi (inverso — menor é melhor)", () => {
  const inv = { metaMin: 10, metaEsp: 5, metaExc: 1, multMin: 0.5, multEsp: 1.0, multExc: 1.5, inverso: true };
  it("retorna 0 acima do min (pior que mínimo)", () => {
    expect(multiplicadorKpi(20, inv)).toBe(0);
  });
  it("retorna multExc abaixo do exc (melhor que excelente)", () => {
    expect(multiplicadorKpi(0.5, inv)).toBe(1.5);
  });
});

describe("multiplicadorComposto", () => {
  it("soma ponderada dos multiplicadores", () => {
    const r = [
      { chave: "a", peso: 0.6, multiplicador: 1.0 },
      { chave: "b", peso: 0.4, multiplicador: 1.5 },
    ];
    expect(multiplicadorComposto(r)).toBeCloseTo(1.2);
  });
});

describe("proRata", () => {
  it("retorna 0 abaixo do mínimo", () => {
    expect(proRata(2, 3)).toBe(0);
  });
  it("retorna fração proporcional acima do mínimo", () => {
    expect(proRata(6, 3)).toBeCloseTo(0.5);
  });
  it("clamp em 12 meses", () => {
    expect(proRata(12, 3)).toBeCloseTo(1.0);
  });
});
