// Opções padrão para cookies do app. Centraliza a flag `secure` para que
// nenhum cookie escape sem ela em produção (defesa contra SSLStrip/MITM).
//
// Use sempre `cookieOptions({ ... overrides })` em vez de literal inline.
const isProd = process.env.NODE_ENV === "production";

export type CookieOpts = {
  httpOnly?: boolean;
  sameSite?: "lax" | "strict" | "none";
  path?: string;
  maxAge?: number;
  secure?: boolean;
};

/** Defaults: httpOnly=true, sameSite=lax, secure=true em prod, path="/". */
export function cookieOptions(overrides: CookieOpts = {}): Required<Omit<CookieOpts, "maxAge">> & { maxAge?: number } {
  return {
    httpOnly: overrides.httpOnly ?? true,
    sameSite: overrides.sameSite ?? "lax",
    path: overrides.path ?? "/",
    secure: overrides.secure ?? isProd,
    ...(overrides.maxAge !== undefined ? { maxAge: overrides.maxAge } : {}),
  };
}
