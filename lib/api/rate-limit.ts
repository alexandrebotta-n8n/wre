// Rate-limit baseado em AuditLog (mesmo padrão de reset-senha).
//
// Por que AuditLog em vez de cache em memória?
//   - Funciona em serverless (Vercel) sem state compartilhado entre instâncias.
//   - Já temos audit log de toda mutação; só conta as do mesmo ator+ação.
//   - Trade-off: 1 query por mutação. Aceitável pra rotas que já fazem write.
//
// Fail-closed: se o DB cai ao contar, recusamos a mutação (mais seguro que
// permitir flood durante outage).
import { prisma } from "@/lib/prisma";

export interface RateLimitConfig {
  /** Prefixo da `acao` no AuditLog (ex: "cenario.criar"). */
  acao: string;
  /** Identificador do ator (usualmente session.id). */
  usuarioId: string;
  /** Quantas mutações permitidas na janela. */
  maxPorUsuario: number;
  /** Tamanho da janela em milissegundos. */
  janelaMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  /** Quantas mutações o usuário fez na janela (até o limite). */
  count?: number;
  /** Mensagem amigável quando bloqueado. */
  motivo?: string;
}

export async function checkRateLimit(cfg: RateLimitConfig): Promise<RateLimitResult> {
  const desde = new Date(Date.now() - cfg.janelaMs);
  try {
    const count = await prisma.auditLog.count({
      where: {
        acao: cfg.acao,
        usuarioId: cfg.usuarioId,
        ocorridoEm: { gte: desde },
      },
    });
    if (count >= cfg.maxPorUsuario) {
      return {
        ok: false,
        count,
        motivo: `Limite atingido: ${cfg.maxPorUsuario} por ${Math.round(cfg.janelaMs / 60000)}min. Aguarde.`,
      };
    }
    return { ok: true, count };
  } catch {
    // Fail-closed: bloqueia se DB falha na contagem (preferimos negar a
    // permitir flood durante outage).
    return { ok: false, motivo: "Não foi possível validar rate-limit. Tente em instantes." };
  }
}
