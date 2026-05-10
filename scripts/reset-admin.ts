// Script utilitário: reseta senha de um usuário ADMIN + limpa rate-limit.
//
// Uso:
//   npx tsx scripts/reset-admin.ts                 # lista admins; reseta se houver só 1
//   npx tsx scripts/reset-admin.ts user@x.com      # reseta exatamente esse email
//
// Funciona em qualquer DB — local ou produção (via DATABASE_URL).
//   DATABASE_URL="postgres://..." npx tsx scripts/reset-admin.ts
import { resetarSenha } from "../lib/usuario-service";
import { prisma } from "../lib/prisma";

async function main() {
  const emailArg = process.argv[2]?.toLowerCase();

  let alvoEmail: string;

  if (emailArg) {
    // Email explícito — vai direto.
    const u = await prisma.usuario.findUnique({ where: { email: emailArg } });
    if (!u) {
      console.error(`✗ Usuário "${emailArg}" não encontrado neste DB.`);
      console.error("  Rode sem argumentos para listar os usuários disponíveis.");
      process.exit(1);
    }
    alvoEmail = u.email;
  } else {
    // Sem email — lista admins ativos.
    const admins = await prisma.usuario.findMany({
      where: { ativo: true, roles: { has: "ADMIN" } },
      orderBy: [{ criadoEm: "asc" }],
    });
    if (admins.length === 0) {
      console.error("✗ Nenhum usuário ADMIN ativo encontrado.");
      console.error("  Verifique a DATABASE_URL ou o seed inicial.");
      process.exit(1);
    }
    if (admins.length === 1) {
      alvoEmail = admins[0].email;
      console.log(`→ Único ADMIN ativo: ${alvoEmail}`);
    } else {
      console.error(`✗ Encontrados ${admins.length} ADMINs ativos. Especifique qual:`);
      for (const a of admins) {
        console.error(`    npx tsx scripts/reset-admin.ts ${a.email}`);
      }
      process.exit(1);
    }
  }

  const u = await prisma.usuario.findUniqueOrThrow({ where: { email: alvoEmail } });
  const senha = await resetarSenha(u.id);
  await prisma.loginEvent.deleteMany({ where: { email: alvoEmail, sucesso: false } });
  console.log("=".repeat(50));
  console.log(`Email: ${alvoEmail}`);
  console.log(`Senha provisória: ${senha}`);
  console.log("=".repeat(50));
  console.log("(Trocada obrigatoriamente no 1º login — middleware força.)");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
