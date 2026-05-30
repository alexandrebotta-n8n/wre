// Schemas Zod para premissas — diferentes por modelo (ATUAL × NOVO).
import { z } from "zod";

export const ParamsAtualSchema = z.object({
  proLaboreMensal: z.number().min(0),
  // unidadeFundadores removido — fundadores agora usam ConfiguracaoAno.fundingFundadoresAno.
  // Mantido como opcional aceito (mas ignorado pelo engine) para compatibilidade
  // com premissas antigas em prod.
  unidadeFundadores: z.string().min(1).optional(),
  unidadeMatriz: z.string().min(1),
  reservaPercentual: z.number().min(0).max(1),
  reservaViraPremio: z.boolean(),
  publicosElegiveisPremio: z.array(z.string()).optional(),
  // Fator de anualização CLT para LIDER_TECNICO (default 14,4 = 12 + 13º + ⅓
  // férias + FGTS médio). Aplicado em vez de meses na rem. gestão.
  // Range 12 (sem benefícios) a 15 (com tudo).
  mesesAnualLiderTecnicoCLT: z.number().min(12).max(15).optional(),
}).strict();
export type ParamsAtualInput = z.infer<typeof ParamsAtualSchema>;

const TOL = 0.001; // tolerância para somatórios

// Distribuição do Bloco B — antes era configurável (5 modos), hoje é regra
// única ALVO_NUM_SALARIOS (nº salários × base individual). Schemas
// DistribuicaoBlocoBEnum, PesosPorAreaSchema, pesoCategoria e proRataMinMeses
// foram REMOVIDOS. Premissas antigas no banco que ainda têm esses campos
// são saneadas pela migration `_premissa_limpar_distribuicao_blocob`.

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
  // Política DSF v1 — itens 5/6/7 dos requisitos:
  proLaboreMensal: z.number().min(0).optional(),         // R$/mês — aplicado a todas as 6 categorias
  taxaComissaoOriginacao: z.number().min(0).max(1).optional(), // ex: 0.05 = 5%
  // Fator de anualização CLT para LIDER_TECNICO — unificado com ATUAL.
  // Default 14,4 (12 + 13º + ⅓ férias + FGTS médio). Range 12 a 15.
  mesesAnualLiderTecnicoCLT: z.number().min(12).max(15).optional(),
})
  .strict()
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
  .refine((p) => p.faixaGestaoMin <= p.faixaGestaoMax, { message: "Faixa gestão: min > max", path: ["faixaGestaoMin"] });
export type ParamsNovoInput = z.infer<typeof ParamsNovoSchema>;

export const CriarPremissaSchema = z.object({
  nome: z.string().min(1).max(120),
  descricao: z.string().max(500).optional(),
  modelo: z.enum(["ATUAL", "NOVO"]),
  parametros: z.union([ParamsAtualSchema, ParamsNovoSchema]),
}).strict();
export type CriarPremissaInput = z.infer<typeof CriarPremissaSchema>;

export const AtualizarPremissaSchema = z.object({
  nome: z.string().min(1).max(120).optional(),
  descricao: z.string().max(500).nullable().optional(),
  parametros: z.union([ParamsAtualSchema, ParamsNovoSchema]).optional(),
}).strict();
export type AtualizarPremissaInput = z.infer<typeof AtualizarPremissaSchema>;
