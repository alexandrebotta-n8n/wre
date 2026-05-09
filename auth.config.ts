// Config edge-safe do Auth.js — usado pelo middleware (edge runtime).
// Não pode importar Prisma/bcrypt. Validação real vive em auth.ts.
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  providers: [],
  callbacks: {
    session({ session, token }) {
      if (session.user && token) {
        const t = token as {
          usuarioId?: string;
          roles?: string[];
          senhaProvisoria?: boolean;
          socioId?: string | null;
        };
        if (t.usuarioId) (session.user as { id?: string }).id = t.usuarioId;
        if (t.roles) (session.user as { roles?: string[] }).roles = t.roles;
        (session.user as { senhaProvisoria?: boolean }).senhaProvisoria =
          t.senhaProvisoria === true;
        (session.user as { socioId?: string | null }).socioId = t.socioId ?? null;
      }
      return session;
    },
    authorized({ auth }) {
      return !!(auth?.user as { id?: string } | undefined)?.id;
    },
  },
} satisfies NextAuthConfig;
