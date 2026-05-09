// Script utilitário: reseta senha do admin@wre.com.br + limpa rate-limit.
// Uso: npx tsx scripts/reset-admin.ts [email]
import { resetarSenha } from "../lib/usuario-service";
import { prisma } from "../lib/prisma";

async function main() {
  const email = (process.argv[2] ?? "admin@wre.com.br").toLowerCase();
  const u = await prisma.usuario.findUnique({ where: { email } });
  if (!u) {
    console.error(`Usuário ${email} não encontrado`);
    process.exit(1);
  }
  const senha = await resetarSenha(u.id);
  await prisma.loginEvent.deleteMany({ where: { email, sucesso: false } });
  console.log("=".repeat(50));
  console.log(`Email: ${email}`);
  console.log(`Senha provisória: ${senha}`);
  console.log("=".repeat(50));
  console.log("(Será trocada no 1º login — middleware força.)");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
