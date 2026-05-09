// Auth.js v5 — apenas Credentials (e-mail/senha).
//
// Decisão: NÃO usar Google OAuth (acesso interno restrito; admin gerencia
// usuários da DSF um a um). Caso venha a ser necessário no futuro, adicionar
// provider Google novamente + variáveis AUTH_GOOGLE_ID/SECRET.
//
// Allowlist: login só passa se houver Usuario { email, ativo: true }.
// Toda tentativa (sucesso/falha) gera LoginEvent — auditoria.
// Credentials força session.strategy="jwt" (limitação Auth.js v5).
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registrarLoginEvent, loginEstaBloqueado } from "@/lib/auth/events";
import { authConfig } from "@/auth.config";
import type { UsuarioRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      roles: UsuarioRole[];
      senhaProvisoria: boolean;
      // Quando o usuário também é Sócio (perfil SOCIO vê seu pacote)
      socioId?: string | null;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    usuarioId?: string;
    roles?: UsuarioRole[];
    senhaProvisoria?: boolean;
    socioId?: string | null;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "E-mail e senha",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").toLowerCase().trim();
        const senha = String(credentials?.password ?? "");
        if (!email || !senha) {
          await registrarLoginEvent({ email: email || "?", sucesso: false, motivo: "sem-email" });
          return null;
        }
        // Rate limit: 10 falhas em 5min bloqueiam o email.
        // Bloqueio expira automaticamente quando as falhas saem da janela.
        if (await loginEstaBloqueado(email)) {
          await registrarLoginEvent({ email, sucesso: false, motivo: "rate-limit" });
          return null;
        }
        const u = await prisma.usuario.findUnique({ where: { email } });
        if (!u) {
          await registrarLoginEvent({ email, sucesso: false, motivo: "email-nao-cadastrado" });
          return null;
        }
        if (!u.ativo) {
          await registrarLoginEvent({ email, usuarioId: u.id, sucesso: false, motivo: "usuario-inativo" });
          return null;
        }
        if (!u.senhaHash) {
          await registrarLoginEvent({ email, usuarioId: u.id, sucesso: false, motivo: "sem-senha" });
          return null;
        }
        const ok = await bcrypt.compare(senha, u.senhaHash);
        if (!ok) {
          await registrarLoginEvent({ email, usuarioId: u.id, sucesso: false, motivo: "senha-invalida" });
          return null;
        }
        await prisma.usuario.update({ where: { id: u.id }, data: { ultimoLogin: new Date() } });
        await registrarLoginEvent({ email, usuarioId: u.id, sucesso: true, motivo: "ok" });
        return { id: u.id, email: u.email, name: u.nome ?? undefined, image: u.imagem ?? undefined };
      },
    }),
  ],
  callbacks: {
    // signIn callback removido: Credentials já valida em authorize().
    async jwt({ token, user }) {
      const email = (user?.email ?? token.email)?.toLowerCase();
      if (!email) return token;
      const u = await prisma.usuario.findUnique({ where: { email } });
      if (!u || !u.ativo) return {};
      token.usuarioId = u.id;
      token.roles = u.roles;
      token.senhaProvisoria = u.senhaProvisoria;
      token.socioId = u.socioId;
      token.email = u.email;
      token.name = u.nome ?? token.name;
      token.picture = u.imagem ?? token.picture;
      return token;
    },
    async session({ session, token }) {
      if (token.usuarioId && session.user) {
        session.user.id = token.usuarioId;
        session.user.roles = (token.roles ?? ["LEITOR"]) as UsuarioRole[];
        session.user.senhaProvisoria = token.senhaProvisoria === true;
        session.user.socioId = token.socioId ?? null;
        if (typeof token.email === "string") session.user.email = token.email;
      }
      return session;
    },
    authorized({ auth: session }) {
      return !!session?.user?.id;
    },
  },
});
