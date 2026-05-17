// Helper para logar tentativas de mutação NEGADAS por permissão insuficiente.
// Sinal de segurança importante: detecta abuso (usuário tentando ações fora do
// seu escopo), erro de UI (botão exposto a quem não pode usar) e bugs de RBAC.
//
// Uso típico:
//   if (!escopo.podeMutar) {
//     await logPermissionDenied(session?.user?.id, "cenario.criar", "Cenario:novo");
//     return;
//   }
//
// O safeMeta do logAudit redige campos sensíveis automaticamente — passe meta
// livremente se precisar de contexto extra.
import { logAudit } from "@/lib/audit";

export async function logPermissionDenied(
  usuarioId: string | undefined,
  acao: string,
  recurso: string,
  meta?: Record<string, unknown>,
): Promise<void> {
  await logAudit({
    usuarioId,
    acao: `auth.denied.${acao}`,
    recurso,
    meta: { motivo: "sem-permissao", ...(meta ?? {}) },
  });
}
