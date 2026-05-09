// Reproduz o que authorize() faz, isolado do Auth.js
import { prisma } from "../lib/prisma";
import { loginEstaBloqueado, registrarLoginEvent } from "../lib/auth/events";
import bcrypt from "bcryptjs";

async function main() {
  const email = "admin@wre.com.br";
  const senha = "25GaUg22PZX2";
  console.log("1. loginEstaBloqueado:", await loginEstaBloqueado(email));
  const u = await prisma.usuario.findUnique({ where: { email } });
  console.log("2. user found:", !!u, "ativo:", u?.ativo);
  if (!u?.senhaHash) { console.log("no hash"); process.exit(1); }
  console.log("3. bcrypt compare:", await bcrypt.compare(senha, u.senhaHash));
  await registrarLoginEvent({ email, usuarioId: u.id, sucesso: true, motivo: "ok" });
  console.log("4. logged event OK");
  await prisma.$disconnect();
}
main().catch(e => { console.error("THREW:", e); process.exit(1); });
