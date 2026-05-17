// Defesa contra CSRF em route handlers que mudam estado (POST/PUT/PATCH/DELETE).
//
// Next.js Server Actions já têm proteção CSRF embutida (token assinado), mas
// route handlers expõem JSON POST diretamente — e dependem só de cookie de
// sessão (sameSite=lax) pra proteção. Lax falha em forms multipart POST de
// outro origem; checagem explícita de Origin é defesa em profundidade.
//
// Estratégia: comparar header `Origin` (ou `Referer` como fallback) com o host
// do request. Se header ausente em produção, bloqueia.
//
// Não chamamos pra GET — leitura não é mutação.
import { ApiError } from "@/lib/api/handler";

/**
 * Garante que o request veio do mesmo origin. Lança ApiError 403 se não.
 *
 * Tolerâncias:
 *   - DEV (NODE_ENV !== "production"): aceita request sem Origin/Referer
 *     (curl, Postman local) pra não atrapalhar desenvolvimento.
 *   - PROD: exige Origin (preferido) ou Referer; bloqueia se ambos faltarem
 *     ou apontarem pra host diferente.
 */
export function assertSameOrigin(req: Request): void {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const host = req.headers.get("host");

  if (process.env.NODE_ENV !== "production") {
    // Em dev permitimos tools (curl/Postman) sem header.
    if (!origin && !referer) return;
  }

  if (!origin && !referer) {
    throw new ApiError("Origem ausente (CSRF protection)", 403);
  }

  const sourceHost = (() => {
    try {
      const url = new URL(origin ?? referer ?? "");
      return url.host;
    } catch {
      return null;
    }
  })();

  if (!sourceHost) {
    throw new ApiError("Origem inválida (CSRF protection)", 403);
  }

  // Forwarded host pode vir via x-forwarded-host em proxies (Vercel).
  const expectedHost = req.headers.get("x-forwarded-host") || host;
  if (!expectedHost || sourceHost !== expectedHost) {
    throw new ApiError("Origem não confiável (CSRF protection)", 403);
  }
}
