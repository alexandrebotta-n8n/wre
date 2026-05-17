// Tipos compartilhados entre os componentes da página /simulacao.
import type { Prisma } from "@prisma/client";

export type CenarioModelo = "ATUAL" | "NOVO";
export type CenarioStatus = "DRAFT" | "APPLIED" | "ARCHIVED";

export interface CenarioListItem {
  id: string;
  nome: string;
  modelo: CenarioModelo;
  status: CenarioStatus;
  ano: number;
  premissaNome: string;
}

export interface PremissaOption {
  id: string;
  nome: string;
  modelo: CenarioModelo;
}

export interface AreaOption {
  codigo: string;
  nome: string;
}

/** Carregamento completo de cenário (page.tsx → componentes). */
export type CenarioCompleto = Prisma.CenarioGetPayload<{
  include: {
    premissa: true;
    classificacoes: {
      include: {
        socio: { include: { areaPratica: true } };
        unidade: { select: { codigo: true; nome: true } };
      };
    };
    remuneracoes: {
      include: {
        socio: { select: { id: true; nome: true; isFundador: true } };
        periodo: true;
      };
    };
  };
}>;

export type Slot = "a" | "b";

/** Item do trace persistido em RemuneracaoCalculada.trace. */
export interface TraceItem {
  etapa: string;
  descricao: string;
  valor?: number;
}

/** Linha agregada da tabela comparativa — totais ANUAIS. */
export interface LinhaComparativa {
  socioId: string;
  nome: string;
  isFundador: boolean;
  /** Total anual. null se sócio não tem nenhuma remuneração no cenário. */
  totalA: number | null;
  totalB: number | null;
  diff: number; // B − A; sinal positivo = ganhou no novo
  diffPct: number | null;
}
