import { prisma } from "@/lib/prisma";

export type LoginMotivo =
  | "ok"
  | "sem-email"
  | "email-nao-cadastrado"
  | "usuario-inativo"
  | "sem-senha"
  | "senha-invalida"
  | "rate-limit";

/**
 * Rate limit baseado em LoginEvent (funciona em serverless).
 * Bloqueia se houve >= MAX falhas para o email nos últimos JANELA_MS.
 *
 * Usado para mitigar brute-force. Não previne ataques distribuídos por IP
 * — para isso, usar Vercel Firewall ou Upstash rate limit (futuro).
 */
const MAX_FALHAS = 10;
const JANELA_MS = 5 * 60 * 1000; // 5 minutos

export async function loginEstaBloqueado(email: string): Promise<boolean> {
  if (!email) return false;
  try {
    const desde = new Date(Date.now() - JANELA_MS);
    const falhas = await prisma.loginEvent.count({
      where: { email, sucesso: false, ocorridoEm: { gte: desde } },
    });
    return falhas >= MAX_FALHAS;
  } catch {
    // Se DB falhou, NÃO bloqueia (fail-open) — evita lock-out por falha de infra.
    return false;
  }
}

export async function registrarLoginEvent(args: {
  email: string;
  sucesso: boolean;
  motivo: LoginMotivo;
  usuarioId?: string;
  ip?: string;
  userAgent?: string;
}): Promise<void> {
  try {
    await prisma.loginEvent.create({
      data: {
        email: args.email,
        sucesso: args.sucesso,
        motivo: args.motivo,
        usuarioId: args.usuarioId,
        ip: args.ip,
        userAgent: args.userAgent,
      },
    });
  } catch {
    // Auditoria não pode quebrar login. Falha silenciosa.
  }
}
