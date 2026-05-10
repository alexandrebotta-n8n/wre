// Schemas Zod para CRUD de resultados financeiros e override no cenário.
import { z } from "zod";

export const ResultadoUnidadeOverrideSchema = z.object({
  lucroLiquido: z.number().finite().optional(),
  fundingVariavel: z.number().finite().optional(),
});

export const ResultadosOverrideSchema = z.record(
  z.string().min(1),
  ResultadoUnidadeOverrideSchema,
);

export type ResultadosOverride = z.infer<typeof ResultadosOverrideSchema>;

export const SalvarResultadoPeriodoSchema = z.object({
  unidadeId: z.string().min(1),
  periodoId: z.string().min(1),
  lucroLiquido: z.number().finite(),
  fundingVariavel: z.number().finite().nullable().optional(),
  ehReal: z.boolean().optional(),
  fonte: z.string().max(120).optional(),
});

export type SalvarResultadoPeriodoInput = z.infer<typeof SalvarResultadoPeriodoSchema>;

export const CriarPeriodoSchema = z.object({
  tipo: z.enum(["TRIMESTRE", "ANO"]),
  ano: z.number().int().min(2020).max(2100),
  trimestre: z.number().int().min(1).max(4).optional(),
  rotulo: z.string().min(1).max(20),
});

export type CriarPeriodoInput = z.infer<typeof CriarPeriodoSchema>;
