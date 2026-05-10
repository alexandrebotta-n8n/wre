// Mensagens flash one-shot via cookie HTTP-only.
//
// Substitui o anti-pattern de `?ok=&erro=` em querystring (que polui URL,
// vaza dados sensíveis em logs/histórico, e persiste em reload).
//
// Fluxo:
//   1. Server Action chama `flashSuccess("Cenário publicado")` ao final
//   2. Layout root renderiza `<FlashConsumer />` (client) que lê o cookie
//      via API route, dispara `toast(...)` da Sonner e remove o cookie.
import { cookies } from "next/headers";
import { cookieOptions } from "@/lib/cookies";

export type FlashType = "success" | "error" | "info" | "warning";

export interface FlashMessage {
  type: FlashType;
  message: string;
  /** Opcional: payload extra (ex: senha gerada para exibir em Dialog). */
  payload?: Record<string, string>;
}

const COOKIE = "wre.flash";

/** Server-side: grava a mensagem no cookie. Use em Server Actions. */
export async function flash(msg: FlashMessage): Promise<void> {
  const c = await cookies();
  c.set(COOKIE, JSON.stringify(msg), cookieOptions({ maxAge: 30 }));
  // 30s — só precisa sobreviver o redirect
}

export const flashSuccess = (message: string, payload?: Record<string, string>) =>
  flash({ type: "success", message, payload });
export const flashError = (message: string, payload?: Record<string, string>) =>
  flash({ type: "error", message, payload });
export const flashInfo = (message: string, payload?: Record<string, string>) =>
  flash({ type: "info", message, payload });
export const flashWarning = (message: string, payload?: Record<string, string>) =>
  flash({ type: "warning", message, payload });

/** Server-side: lê e consome (remove) o cookie. Para a API route do consumer. */
export async function consumeFlash(): Promise<FlashMessage | null> {
  const c = await cookies();
  const raw = c.get(COOKIE)?.value;
  if (!raw) return null;
  c.delete(COOKIE);
  try {
    return JSON.parse(raw) as FlashMessage;
  } catch {
    return null;
  }
}
