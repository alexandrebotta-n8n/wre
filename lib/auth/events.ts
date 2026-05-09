import { prisma } from "@/lib/prisma";

export type LoginMotivo =
  | "ok"
  | "sem-email"
  | "email-nao-cadastrado"
  | "usuario-inativo"
  | "sem-senha"
  | "senha-invalida";

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
