// Zod schemas — validação de borda das APIs de cenário.
// Tipos derivados via z.infer<typeof X>.
import { z } from "zod";

export const PublicoEnum = z.enum([
  "SOCIO_CAPITAL",
  "SOCIO_CAPITAL_GESTOR",
  "SOCIO_CAPITAL_LIDER_UNIDADE",
  "SOCIO_SERVICOS",
  "SOCIO_SERVICOS_ESTRATEGICO",
  "LIDER_UNIDADE_NON_EQUITY",
  "LIDER_TECNICO",
  "FUNDADOR",
]);

export const NivelCargoEnum = z.enum(["A", "B", "C", "D"]);
export const FaixaSalarialEnum = z.enum(["INICIAL", "PLENO", "EXPERT"]);
export const ModeloRegraEnum = z.enum(["ATUAL", "NOVO"]);

export const CriarCenarioSchema = z.object({
  nome: z.string().min(1).max(120),
  descricao: z.string().max(500).optional(),
  ano: z.number().int().min(2020).max(2100),
  modelo: ModeloRegraEnum,
  premissaId: z.string().min(1),
  // Quando omitido: o servidor inicia com classificação automática
  // (FUNDADOR/SOCIO_CAPITAL_GESTOR conforme isFundador) para o modelo ATUAL,
  // ou classificação herdada do cenário NOVO mais recente, se houver.
  classificacoes: z
    .array(
      z.object({
        socioId: z.string().min(1),
        publico: PublicoEnum,
        unidadeId: z.string().nullable().optional(),
        percentualQuotas: z.number().min(0).max(1),
        originacaoEsperada: z.number().min(0).default(0),
        nivelCargoOverride: NivelCargoEnum.nullable().optional(),
        faixaSalarialOverride: FaixaSalarialEnum.nullable().optional(),
      }),
    )
    .optional(),
});
export type CriarCenarioInput = z.infer<typeof CriarCenarioSchema>;

export const AtualizarClassificacaoSchema = z.object({
  socioId: z.string().min(1),
  publico: PublicoEnum,
  unidadeId: z.string().nullable().optional(),
  percentualQuotas: z.number().min(0).max(1),
  originacaoEsperada: z.number().min(0),
  nivelCargoOverride: NivelCargoEnum.nullable().optional(),
  faixaSalarialOverride: FaixaSalarialEnum.nullable().optional(),
});
export type AtualizarClassificacaoInput = z.infer<typeof AtualizarClassificacaoSchema>;

export const CalcularCenarioSchema = z.object({
  periodoId: z.string().min(1),
});
export type CalcularCenarioInput = z.infer<typeof CalcularCenarioSchema>;

// Override de parâmetros — JSON livre, validado pelo schema correto do modelo
// (ParamsAtualSchema | ParamsNovoSchema) dentro do serviço, conforme o
// `Cenario.modelo`. Aqui só garantimos que é um objeto.
export const AtualizarOverrideSchema = z.object({
  parametrosOverride: z.record(z.string(), z.unknown()).nullable(),
});
export type AtualizarOverrideInput = z.infer<typeof AtualizarOverrideSchema>;
