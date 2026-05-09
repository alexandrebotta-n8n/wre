// Middleware (edge runtime) — gating real do app.
// Roda na borda, não pode usar Prisma. Decide:
//   - Pública? Deixa passar.
//   - Sem session? Redireciona pra /login.
//   - Senha provisória? Força /perfil/senha.
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const PUBLIC_PATHS = [/^\/login/, /^\/api\/auth/, /^\/_next/, /^\/favicon/, /^\/public/];
const SENHA_PROVISORIA_PATH = "/perfil/senha";

export const { auth: middleware } = NextAuth(authConfig);

export default middleware((req) => {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((re) => re.test(pathname))) return;

  const user = req.auth?.user as { id?: string; senhaProvisoria?: boolean } | undefined;
  if (!user?.id) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return Response.redirect(url);
  }
  if (user.senhaProvisoria && pathname !== SENHA_PROVISORIA_PATH) {
    const url = req.nextUrl.clone();
    url.pathname = SENHA_PROVISORIA_PATH;
    return Response.redirect(url);
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
