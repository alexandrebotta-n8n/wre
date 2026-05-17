// Helpers para route handlers — wrapping consistente de auth + erro + JSON.
import { ZodError, type z } from "zod";
import { AuthError, requireSession, requireRole } from "@/lib/auth/guards";
import { assertSameOrigin } from "@/lib/api/origin-check";
import type { UsuarioRole } from "@prisma/client";

export class ApiError extends Error {
  constructor(message: string, public status: number = 400) {
    super(message);
    this.name = "ApiError";
  }
  toResponse(): Response {
    return Response.json({ error: this.message }, { status: this.status });
  }
}

/**
 * Aplica `Cache-Control: no-store, private` em uma Response. Use em endpoints
 * que retornam dados sensíveis (senhas provisórias, listas de usuários) para
 * impedir caching em proxies/CDN/WAF intermediários e no histórico do browser.
 */
export function noStore(res: Response): Response {
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.headers.set("Pragma", "no-cache");
  return res;
}

export async function withAuth<T>(
  handler: (session: Awaited<ReturnType<typeof requireSession>>) => Promise<T>,
  options?: {
    roles?: UsuarioRole[];
    noStore?: boolean;
    /** Request a ser usado para checagem de Origin (CSRF). Necessário para
     *  rotas que mudam estado (POST/PUT/PATCH/DELETE). */
    req?: Request;
  },
): Promise<Response> {
  try {
    if (options?.req) {
      // CSRF defense-in-depth para rotas mutantes — checa Origin/Referer.
      assertSameOrigin(options.req);
    }
    const session = options?.roles
      ? await requireRole(...options.roles)
      : await requireSession();
    const result = await handler(session);
    const res = result instanceof Response ? result : Response.json(result);
    return options?.noStore ? noStore(res) : res;
  } catch (e) {
    if (e instanceof AuthError) return e.toResponse();
    if (e instanceof ApiError) return e.toResponse();
    if (e instanceof ZodError) {
      return Response.json({ error: "validação", issues: e.issues }, { status: 422 });
    }
    console.error("[api] erro inesperado:", e);
    return Response.json({ error: "erro interno" }, { status: 500 });
  }
}

export async function parseJson<S extends z.ZodTypeAny>(
  req: Request,
  schema: S,
): Promise<z.infer<S>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError("body JSON inválido", 400);
  }
  return schema.parse(body) as z.infer<S>;
}
