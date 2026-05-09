import { prisma } from "@/lib/prisma";

// Termos sensíveis que devem ser redigidos em logs de auditoria.
// Cobre:
//   - credenciais: senha, password, token, secret, hash
//   - PII: cpf, cnpj, rg
//   - remuneração (cláusula 17.4 — sigilo 5 anos): salario, pro-labore, bloco A/B/C,
//     pool, prêmio, ajustes, total, originação/execução/gestão (créditos),
//     percentualQuotas, fundingVariavel
const SENSITIVE_KEYS =
  /(senha|password|token|secret|hash|salario|cpf|cnpj|\brg\b|prolabore|pro.?labore|remuneracao|^bloco[abc]$|^pool|^premio$|^ajustes$|^total$|creditoOriginacao|creditoExecucao|creditoGestaoCP|percentualQuotas|fundingVariavel)/i;
const MAX_VALUE_LEN = 200;

// Sanitiza meta para AuditLog: redige chaves sensíveis, trunca valores longos.
// CRÍTICO no contexto DSF: dados de remuneração individual são confidenciais
// (cláusula 17.4 da Política de Partnership — sigilo de 5 anos pós-término).
export function safeMeta(input: unknown): unknown {
  if (input === null || input === undefined) return input;
  if (typeof input === "string") {
    return input.length > MAX_VALUE_LEN ? input.slice(0, MAX_VALUE_LEN) + "…" : input;
  }
  if (typeof input !== "object") return input;
  if (Array.isArray(input)) return input.map(safeMeta);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.test(k)) {
      out[k] = "[REDACTED]";
    } else {
      out[k] = safeMeta(v);
    }
  }
  return out;
}

export async function logAudit(args: {
  usuarioId?: string;
  acao: string;
  recurso: string;
  ip?: string;
  userAgent?: string;
  meta?: unknown;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        usuarioId: args.usuarioId,
        acao: args.acao,
        recurso: args.recurso,
        ip: args.ip,
        userAgent: args.userAgent,
        meta: args.meta === undefined ? undefined : (safeMeta(args.meta) as never),
      },
    });
  } catch {
    // Auditoria nunca quebra o request principal.
  }
}
