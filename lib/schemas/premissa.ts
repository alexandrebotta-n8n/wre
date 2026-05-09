// Schemas Zod para premissas — diferentes por modelo (ATUAL × NOVO).
import { z } from "zod";

export const ParamsAtualSchema = z.object({
  proLaboreMensal: z.number().min(0),
  unidadeFundadores: z.string().min(1),
  unidadeMatriz: z.string().min(1),
  reservaPercentual: z.number().min(0).max(1),
  reservaViraPremio: z.boolean(),
  publicosElegiveisPremio: z.array(z.string()).optional(),
});
export type ParamsAtualInput = z.infer<typeof ParamsAtualSchema>;

export const DistribuicaoBlocoBEnum = z.enum(["UNIFORME", "PESO_INDIVIDUAL", "ORIGINACAO", "POR_AREA"]);

export const PesosPorAreaSchema = z.object({
  mixOrganico: z.number().min(0).max(1),
  mixIncremental: z.number().min(0).max(1),
  pesosOrganico: z.record(z.string(), z.number().min(0).max(1)),
  pesosIncremental: z.record(z.string(), z.number().min(0).max(1)),
}).optional();

const TOL = 0.001; // tolerância para somatórios

export const ParamsNovoSchema = z.object({
  percentualBlocoA: z.number().min(0).max(1),
  percentualBlocoB: z.number().min(0).max(1),
  percentualBlocoC: z.number().min(0).max(1),
  poolSociedade: z.number().min(0).max(1),
  poolLider: z.number().min(0).max(1),
  poolEquipeReserva: z.number().min(0).max(1),
  chaveOriginacao: z.number().min(0).max(1),
  chaveExecucao: z.number().min(0).max(1),
  chaveGestaoCP: z.number().min(0).max(1),
  faixaOrigMin: z.number().min(0).max(1),
  faixaOrigMax: z.number().min(0).max(1),
  faixaExecMin: z.number().min(0).max(1),
  faixaExecMax: z.number().min(0).max(1),
  faixaGestaoMin: z.number().min(0).max(1),
  faixaGestaoMax: z.number().min(0).max(1),
  proRataMinMeses: z.number().int().min(0).max(12),
  distribuicaoBlocoB: DistribuicaoBlocoBEnum.default("UNIFORME"),
  pesosPorArea: PesosPorAreaSchema,
})
  .refine(
    (p) => Math.abs(p.percentualBlocoA + p.percentualBlocoB + p.percentualBlocoC - 1) <= TOL,
    { message: "Blocos A + B + C devem somar 1.0", path: ["percentualBlocoA"] },
  )
  .refine(
    (p) => Math.abs(p.poolSociedade + p.poolLider + p.poolEquipeReserva - 1) <= TOL,
    { message: "Pool (sociedade + líder + equipe) deve somar 1.0", path: ["poolSociedade"] },
  )
  .refine(
    (p) => Math.abs(p.chaveOriginacao + p.chaveExecucao + p.chaveGestaoCP - 1) <= TOL,
    { message: "Chave (orig + exec + gestão) deve somar 1.0", path: ["chaveOriginacao"] },
  )
  .refine((p) => p.faixaOrigMin <= p.faixaOrigMax, { message: "Faixa originação: min > max", path: ["faixaOrigMin"] })
  .refine((p) => p.faixaExecMin <= p.faixaExecMax, { message: "Faixa execução: min > max", path: ["faixaExecMin"] })
  .refine((p) => p.faixaGestaoMin <= p.faixaGestaoMax, { message: "Faixa gestão: min > max", path: ["faixaGestaoMin"] })
  .refine(
    (p) => {
      if (!p.pesosPorArea) return true;
      return Math.abs(p.pesosPorArea.mixOrganico + p.pesosPorArea.mixIncremental - 1) <= TOL;
    },
    { message: "Mix Orgânico + Incremental deve somar 1.0", path: ["pesosPorArea"] },
  )
  .refine(
    (p) => {
      if (!p.pesosPorArea) return true;
      const s = Object.values(p.pesosPorArea.pesosOrganico).reduce((a, v) => a + v, 0);
      return Math.abs(s - 1) <= TOL;
    },
    { message: "Pesos Orgânicos por área devem somar 1.0", path: ["pesosPorArea"] },
  )
  .refine(
    (p) => {
      if (!p.pesosPorArea) return true;
      const s = Object.values(p.pesosPorArea.pesosIncremental).reduce((a, v) => a + v, 0);
      return Math.abs(s - 1) <= TOL;
    },
    { message: "Pesos Incrementais por área devem somar 1.0", path: ["pesosPorArea"] },
  );
export type ParamsNovoInput = z.infer<typeof ParamsNovoSchema>;

export const CriarPremissaSchema = z.object({
  nome: z.string().min(1).max(120),
  descricao: z.string().max(500).optional(),
  modelo: z.enum(["ATUAL", "NOVO"]),
  parametros: z.union([ParamsAtualSchema, ParamsNovoSchema]),
});
export type CriarPremissaInput = z.infer<typeof CriarPremissaSchema>;

export const AtualizarPremissaSchema = z.object({
  nome: z.string().min(1).max(120).optional(),
  descricao: z.string().max(500).nullable().optional(),
  parametros: z.union([ParamsAtualSchema, ParamsNovoSchema]).optional(),
});
export type AtualizarPremissaInput = z.infer<typeof AtualizarPremissaSchema>;
