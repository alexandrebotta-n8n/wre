// Testes do helper puro redistribuirQuotas (lib/domain/dsf/quotas.ts).
//
// Cobre: caso típico, sem capital remanescente, sem zerar ninguém,
// 100% fundadores, e preservação de outras categorias (líder non-equity).
import { describe, it, expect } from "vitest";
import { redistribuirQuotas } from "@/lib/domain/dsf/quotas";
import type { Publico } from "@/lib/domain/dsf/tipos";

// Helper que monta SocioParaRedistribuir mínimo.
function s(
  id: string,
  publico: Publico,
  isFundador: boolean,
  quota: number,
) {
  return { id, publico, isFundador, percentualQuotas: quota };
}

describe("redistribuirQuotas — caso típico", () => {
  it("zera fundadores+serviços; capital remanescente absorve proporcional", () => {
    // Setup: 2 fundadores (15%+15%=30%), 1 serviços (5%), 3 capitais (20%/25%/20%=65%)
    // Total original ≈ 100%. totalZerado = 35%, somaCapital = 65%.
    // Fator = (65+35)/65 = 100/65 ≈ 1.538.
    const socios = [
      s("f1", "SOCIO_CAPITAL", true, 0.15),
      s("f2", "SOCIO_CAPITAL", true, 0.15),
      s("serv", "SOCIO_SERVICOS", false, 0.05),
      s("c1", "SOCIO_CAPITAL", false, 0.20),
      s("c2", "SOCIO_CAPITAL_GESTOR", false, 0.25),
      s("c3", "SOCIO_CAPITAL_LIDER_UNIDADE", false, 0.20),
    ];
    const r = redistribuirQuotas(socios);

    // Fundadores zerados.
    expect(r.get("f1")).toBe(0);
    expect(r.get("f2")).toBe(0);
    // Serviços zerado.
    expect(r.get("serv")).toBe(0);
    // Capitais recebem proporcionalmente.
    const fator = (0.65 + 0.35) / 0.65;
    expect(r.get("c1")).toBeCloseTo(0.20 * fator, 6);
    expect(r.get("c2")).toBeCloseTo(0.25 * fator, 6);
    expect(r.get("c3")).toBeCloseTo(0.20 * fator, 6);
    // Soma total das quotas redistribuídas ≈ 100% (mesmo total, divisão diferente).
    const soma = [...r.values()].reduce((acc, v) => acc + v, 0);
    expect(soma).toBeCloseTo(1.0, 6);
  });

  it("inclui SOCIO_CAPITAL_GESTOR e SOCIO_CAPITAL_LIDER_UNIDADE como remanescentes", () => {
    const socios = [
      s("f", "SOCIO_CAPITAL", true, 0.30),
      s("g", "SOCIO_CAPITAL_GESTOR", false, 0.35),
      s("l", "SOCIO_CAPITAL_LIDER_UNIDADE", false, 0.35),
    ];
    const r = redistribuirQuotas(socios);
    expect(r.get("f")).toBe(0);
    // Gestor e Líder repartem os 30% do fundador proporcional (50/50 nesse caso).
    expect(r.get("g")).toBeCloseTo(0.50, 6);
    expect(r.get("l")).toBeCloseTo(0.50, 6);
  });
});

describe("redistribuirQuotas — edge cases", () => {
  it("sem fundadores nem serviços → quotas idênticas às originais", () => {
    const socios = [
      s("c1", "SOCIO_CAPITAL", false, 0.50),
      s("c2", "SOCIO_CAPITAL_GESTOR", false, 0.50),
    ];
    const r = redistribuirQuotas(socios);
    expect(r.get("c1")).toBeCloseTo(0.50, 6);
    expect(r.get("c2")).toBeCloseTo(0.50, 6);
  });

  it("sem capital remanescente (todos fundadores) → todos zerados, sem divisão por zero", () => {
    const socios = [
      s("f1", "SOCIO_CAPITAL", true, 0.40),
      s("f2", "SOCIO_CAPITAL", true, 0.60),
    ];
    const r = redistribuirQuotas(socios);
    expect(r.get("f1")).toBe(0);
    expect(r.get("f2")).toBe(0);
    // Soma total = 0 — engine lida (Bloco A vira 0, distribuição residual vira 0).
    const soma = [...r.values()].reduce((acc, v) => acc + v, 0);
    expect(soma).toBe(0);
  });

  it("só SOCIO_SERVICOS, sem capital remanescente → todos zerados", () => {
    const socios = [
      s("s1", "SOCIO_SERVICOS", false, 0.50),
      s("s2", "SOCIO_SERVICOS", false, 0.50),
    ];
    const r = redistribuirQuotas(socios);
    expect(r.get("s1")).toBe(0);
    expect(r.get("s2")).toBe(0);
  });

  it("Líder Non-Equity preserva quota original (não zera nem recebe)", () => {
    const socios = [
      s("f", "SOCIO_CAPITAL", true, 0.20),
      s("ne", "LIDER_UNIDADE_NON_EQUITY", false, 0.05),
      s("c", "SOCIO_CAPITAL", false, 0.75),
    ];
    const r = redistribuirQuotas(socios);
    expect(r.get("f")).toBe(0);
    // Non-equity mantém os 5% originais — não é capital remanescente, não entra na redistribuição.
    expect(r.get("ne")).toBeCloseTo(0.05, 6);
    // Capital remanescente absorve só os 20% do fundador (não os 5% do non-equity).
    // Fator = (0.75 + 0.20) / 0.75 = 0.95/0.75 ≈ 1.2667.
    expect(r.get("c")).toBeCloseTo(0.95, 6);
    // Soma total = 0 + 0.05 + 0.95 = 1.0 (preservada).
    const soma = [...r.values()].reduce((acc, v) => acc + v, 0);
    expect(soma).toBeCloseTo(1.0, 6);
  });

  it("SOCIO_SERVICOS_ESTRATEGICO NÃO zera (só SOCIO_SERVICOS puro zera)", () => {
    const socios = [
      s("se", "SOCIO_SERVICOS_ESTRATEGICO", false, 0.30),
      s("c", "SOCIO_CAPITAL", false, 0.70),
    ];
    const r = redistribuirQuotas(socios);
    // Quotas inalteradas — SE não é zerado, e sem zerados não há redistribuição.
    expect(r.get("se")).toBeCloseTo(0.30, 6);
    expect(r.get("c")).toBeCloseTo(0.70, 6);
  });
});
