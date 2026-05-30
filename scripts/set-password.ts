// Helper rápido pra testes manuais — define senha conhecida e limpa flag provisória.
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

async function main() {
  const email = process.argv[2] ?? "admin@wre.com.br";
  const senha = process.argv[3] ?? "TestePass2026!";
  const hash = await bcrypt.hash(senha, 12);
  await prisma.usuario.update({
    where: { email },
    data: { senhaHash: hash, senhaProvisoria: false },
  });
  await prisma.loginEvent.deleteMany({ where: { email, sucesso: false } });
  console.log(`✓ ${email} → senha "${senha}" (senhaProvisoria=false)`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
