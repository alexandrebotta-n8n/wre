// Helpers para testes de integração — apenas para usar contra DB de teste.
// Guardrail: aborta se DATABASE_URL não contém "_test".
import { PrismaClient } from "@prisma/client";

const url = process.env.DATABASE_URL ?? "";
if (!url.includes("_test")) {
  throw new Error(
    `tests/helpers/db.ts: DATABASE_URL não contém "_test" (${url}). ` +
      `Recuso operar — risco de TRUNCATE em DB de produção.`,
  );
}

export const testPrisma = new PrismaClient({ log: ["error"] });

// Limpa todas as tabelas de domínio. Use em beforeEach.
export async function resetDb(): Promise<void> {
  if (!url.includes("_test")) throw new Error("guardrail: DB não é _test");
  await testPrisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "AuditLog", "LoginEvent",
      "RemuneracaoCalculada",
      "ClassificacaoSocio",
      "Cenario", "Premissa",
      "ResultadoPeriodo", "Periodo",
      "Socio",
      "TabelaSalario", "Unidade",
      "Usuario"
    RESTART IDENTITY CASCADE
  `);
}
