import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
async function main() {
  const senha = process.argv[2];
  const email = process.argv[3] ?? "admin@wre.com.br";
  if (!senha) { console.error("uso: tsx scripts/verifica-senha.ts <senha> [email]"); process.exit(1); }
  const u = await prisma.usuario.findUnique({ where: { email } });
  if (!u || !u.senhaHash) { console.error("usuário sem hash"); process.exit(1); }
  const ok = await bcrypt.compare(senha, u.senhaHash);
  console.log(`Email: ${email}`);
  console.log(`Senha "${senha}" → ${ok ? "✅ BATE" : "❌ NÃO BATE"}`);
  console.log(`senhaProvisoria=${u.senhaProvisoria} ativo=${u.ativo}`);
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
