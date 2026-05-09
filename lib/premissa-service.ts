// Service de Premissa — encapsula a regra "snapshot antes de update".
//
// Uso:
//   await atualizarPremissaComSnapshot(id, dadosNovos, { snapshotPorId, motivo })
//
// Implementação: transação que (1) lê estado atual, (2) cria PremissaHistorico
// com a versão atual, (3) atualiza Premissa incrementando versao.
import { prisma } from "@/lib/prisma";
import type { Premissa } from "@prisma/client";

export interface AtualizarPremissaArgs {
  nome?: string;
  descricao?: string | null;
  parametros?: unknown;
}

export interface SnapshotMeta {
  snapshotPorId?: string;
  motivo?: string;
}

export async function atualizarPremissaComSnapshot(
  id: string,
  args: AtualizarPremissaArgs,
  meta: SnapshotMeta = {},
): Promise<Premissa> {
  return prisma.$transaction(async (tx) => {
    const atual = await tx.premissa.findUnique({ where: { id } });
    if (!atual) throw new Error(`Premissa ${id} não encontrada`);

    // 1. snapshot da versão atual (antes da mudança)
    await tx.premissaHistorico.create({
      data: {
        premissaId: atual.id,
        versao: atual.versao,
        nome: atual.nome,
        descricao: atual.descricao,
        parametros: atual.parametros as never,
        snapshotPorId: meta.snapshotPorId,
        motivo: meta.motivo,
      },
    });

    // 2. update + incrementa versão
    return tx.premissa.update({
      where: { id },
      data: {
        nome: args.nome ?? undefined,
        descricao: args.descricao === undefined ? undefined : args.descricao,
        parametros: args.parametros === undefined ? undefined : (args.parametros as never),
        versao: { increment: 1 },
      },
    });
  });
}

// Restaura premissa para uma versão histórica específica.
// Internamente: faz snapshot da versão atual e aplica os params da histórica.
export async function restaurarVersao(args: {
  premissaId: string;
  historicoId: string;
  porId?: string;
}): Promise<Premissa> {
  const hist = await prisma.premissaHistorico.findUnique({ where: { id: args.historicoId } });
  if (!hist || hist.premissaId !== args.premissaId) {
    throw new Error("Histórico não encontrado");
  }
  return atualizarPremissaComSnapshot(
    args.premissaId,
    {
      nome: hist.nome,
      descricao: hist.descricao,
      parametros: hist.parametros,
    },
    {
      snapshotPorId: args.porId,
      motivo: `Restaurado da versão ${hist.versao}`,
    },
  );
}
