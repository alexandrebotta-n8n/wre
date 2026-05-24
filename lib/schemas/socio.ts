// Schema Zod para atualização de Socio na tela /socios.
//
// .strict() rejeita campos extras no body — defesa contra mass assignment.
// Campos estruturais (nome, cargo, isFundador, pontuacaoCargo, ativo) NÃO
// são editáveis pela UI; ficaram de fora do schema de propósito. Para mudar
// um desses, é preciso script/seed.
//
// Atenção: unidadeLideradaId só faz sentido quando publicoDefault ∈
// {SOCIO_CAPITAL_LIDER_UNIDADE, LIDER_UNIDADE_NON_EQUITY}. A action zera o
// campo automaticamente quando a classificação não é de líder (defesa em
// profundidade — UI também esconde o select).
import { z } from "zod";

const PublicoEditavelEnum = z.enum([
  "SOCIO_CAPITAL",
  "SOCIO_CAPITAL_GESTOR",
  "SOCIO_CAPITAL_LIDER_UNIDADE",
  "SOCIO_SERVICOS",
  "SOCIO_SERVICOS_ESTRATEGICO",
  "LIDER_UNIDADE_NON_EQUITY",
  // FUNDADOR e LIDER_TECNICO ficam de fora — FUNDADOR é categoria
  // controlada por Socio.isFundador (estrutural); LIDER_TECNICO é legado.
]);

// publicoAtual aceita LIDER_TECNICO (categoria legado da política ATUAL).
// Permite modelar caso onde um sócio é Líder Técnico CLT hoje (ATUAL) e
// vira Sócio de Serviços PJ na nova política (publicoDefault).
const PublicoAtualEnum = z.enum([
  "SOCIO_CAPITAL",
  "SOCIO_CAPITAL_GESTOR",
  "SOCIO_CAPITAL_LIDER_UNIDADE",
  "SOCIO_SERVICOS",
  "SOCIO_SERVICOS_ESTRATEGICO",
  "LIDER_UNIDADE_NON_EQUITY",
  "LIDER_TECNICO",
]);

const NivelCargoEnum = z.enum(["A", "B", "C", "D"]);
const FaixaSalarialEnum = z.enum(["INICIAL", "PLENO", "EXPERT"]);

export const PUBLICOS_LIDER_DE_UNIDADE = new Set([
  "SOCIO_CAPITAL_LIDER_UNIDADE",
  "LIDER_UNIDADE_NON_EQUITY",
]);

export const AtualizarSocioSchema = z
  .object({
    areaPraticaId: z.string().min(1).nullable(),
    publicoDefault: PublicoEditavelEnum,
    // Override para política ATUAL (legado). null = usa heurística por cargo.
    publicoAtual: PublicoAtualEnum.nullable(),
    unidadeLideradaId: z.string().min(1).nullable(),
    nivelCargo: NivelCargoEnum.nullable(),
    faixaSalarial: FaixaSalarialEnum.nullable(),
    percentualQuotasDefault: z.number().min(0).max(1),
    // Overrides individuais de remuneração (commit 70ee148).
    // Null = usa default (Premissa.proLaboreMensal / TabelaSalario).
    proLaboreMensal: z.number().min(0).nullable(),
    remuneracaoGestaoMensal: z.number().min(0).nullable(),
    // Insumos individuais anuais (commit 20260518).
    // Originação alimenta a Comissão de Originação (NOVO);
    // Funding fundador é deduzido do LL antes do RDA/funding residual.
    originacaoAnualPadrao: z.number().min(0).nullable(),
    fundingFundadorAnual: z.number().min(0).nullable(),
    // Alvo Bloco B em nº salários (modo ALVO_NUM_SALARIOS do engine NOVO).
    // 0 ou null = não participa.
    blocoBNumSalariosAlvo: z.number().int().min(0).max(50).nullable(),
    observacoes: z.string().max(500).nullable(),
  })
  .strict();
export type AtualizarSocioInput = z.infer<typeof AtualizarSocioSchema>;
