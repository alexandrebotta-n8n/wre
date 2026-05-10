import { prisma } from "@/lib/prisma";

export type LoginMotivo =
  | "ok"
  | "sem-email"
  | "email-nao-cadastrado"
  | "usuario-inativo"
  | "sem-senha"
  | "senha-invalida"
  | "rate-limit"
  | "rate-limit-ip";

/**
 * Rate limit baseado em LoginEvent (funciona em serverless).
 * Bloqueia se houve >= MAX falhas para o email/IP nos últimos JANELA_MS.
 *
 * Defesa em camadas:
 *   - Por email: 10 falhas / 5min — protege conta individual contra
 *     password-guessing direcionado.
 *   - Por IP:    30 falhas / 5min em emails distintos — protege contra
 *     password-spray (atacante prova 1 senha em vários emails do mesmo IP).
 *
 * Fail-closed: se o DB cai durante a checagem, BLOQUEIAMOS por 60s em
 * cache local de processo. Evita que falha de infra abra brute-force
 * ilimitado. Reset automático quando DB volta.
 */
const MAX_FALHAS_EMAIL = 10;
const MAX_FALHAS_IP = 30;
const JANELA_MS = 5 * 60 * 1000; // 5 minutos
const FAIL_CLOSED_TTL_MS = 60 * 1000; // 1min de bloqueio se DB cai

// Cache em memória de processo (não compartilhado entre instâncias).
// Fail-closed é por instância — pior caso: atacante muda de instância
// (Vercel) e tenta de novo. Ainda assim limita janela de exploração.
const failClosedCache = new Map<string, number>();

function marcaFailClosed(chave: string): void {
  failClosedCache.set(chave, Date.now() + FAIL_CLOSED_TTL_MS);
}

function estaFailClosed(chave: string): boolean {
  const exp = failClosedCache.get(chave);
  if (!exp) return false;
  if (exp < Date.now()) {
    failClosedCache.delete(chave);
    return false;
  }
  return true;
}

export async function loginEstaBloqueado(email: string, ip?: string): Promise<boolean> {
  if (!email) return false;
  const chaveEmail = `email:${email}`;
  const chaveIp = ip ? `ip:${ip}` : null;
  if (estaFailClosed(chaveEmail) || (chaveIp && estaFailClosed(chaveIp))) return true;
  try {
    const desde = new Date(Date.now() - JANELA_MS);
    const [falhasEmail, falhasIp] = await Promise.all([
      prisma.loginEvent.count({
        where: { email, sucesso: false, ocorridoEm: { gte: desde } },
      }),
      ip
        ? prisma.loginEvent.count({
            where: { ip, sucesso: false, ocorridoEm: { gte: desde } },
          })
        : Promise.resolve(0),
    ]);
    return falhasEmail >= MAX_FALHAS_EMAIL || falhasIp >= MAX_FALHAS_IP;
  } catch {
    // Fail-closed: marca cache e bloqueia. Próxima checagem dentro de 60s
    // retorna true sem tocar no DB.
    marcaFailClosed(chaveEmail);
    if (chaveIp) marcaFailClosed(chaveIp);
    return true;
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
