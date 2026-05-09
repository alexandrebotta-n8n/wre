// Cookie HTTP-only one-shot para passar senha provisória recém-gerada
// do Server Action (criar/resetar usuário) para um Dialog client-side.
// NUNCA passe senha via querystring.
import { cookies } from "next/headers";

const COOKIE = "wre.senhaGerada";

export async function setSenhaGerada(payload: { senha: string; email?: string; usuarioId?: string }): Promise<void> {
  const c = await cookies();
  c.set(COOKIE, JSON.stringify(payload), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60, // 1 minuto — suficiente para o redirect e leitura
  });
}
