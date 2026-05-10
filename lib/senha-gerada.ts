// Cookie HTTP-only one-shot para passar senha provisória recém-gerada
// do Server Action (criar/resetar usuário) para um Dialog client-side.
// NUNCA passe senha via querystring.
import { cookies } from "next/headers";
import { cookieOptions } from "@/lib/cookies";

const COOKIE = "wre.senhaGerada";

export async function setSenhaGerada(payload: { senha: string; email?: string; usuarioId?: string }): Promise<void> {
  const c = await cookies();
  // 60s — suficiente para o redirect e leitura. httpOnly+secure: cookie não
  // é acessível via JS e não trafega em downgrade HTTP.
  c.set(COOKIE, JSON.stringify(payload), cookieOptions({ maxAge: 60 }));
}
