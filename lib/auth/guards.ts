import { auth } from "@/auth";
import type { UsuarioRole } from "@prisma/client";

export class AuthError extends Error {
  constructor(message: string, public status: number = 401) {
    super(message);
    this.name = "AuthError";
  }
  toResponse(): Response {
    return Response.json({ error: this.message }, { status: this.status });
  }
}

export interface SessionUser {
  id: string;
  email: string;
  roles: UsuarioRole[];
  senhaProvisoria: boolean;
  socioId?: string | null;
}

export async function requireSession(): Promise<SessionUser> {
  const s = await auth();
  if (!s?.user?.id) throw new AuthError("Não autenticado", 401);
  if (s.user.senhaProvisoria) throw new AuthError("Senha provisória — troque em /perfil/senha", 403);
  return s.user as SessionUser;
}

export async function requireRole(...roles: UsuarioRole[]): Promise<SessionUser> {
  const u = await requireSession();
  if (!u.roles.some((r) => roles.includes(r))) {
    throw new AuthError("Permissão insuficiente", 403);
  }
  return u;
}
