// Script utilitário: migra emails de domínio antigo → novo.
// Uso:
//   DATABASE_URL="..." npx tsx scripts/migrar-emails.ts @wre.local @wre.com.br
//
// Atualiza Usuario.email + LoginEvent.email correspondentes.
// Idempotente — se nenhum usuário tem o domínio antigo, sai sem efeito.
import { prisma } from "../lib/prisma";

async function main() {
  const dominioAntigo = process.argv[2];
  const dominioNovo = process.argv[3];
  if (!dominioAntigo || !dominioNovo) {
    console.error("Uso: tsx scripts/migrar-emails.ts <antigo> <novo>");
    console.error("Ex:  tsx scripts/migrar-emails.ts @wre.local @wre.com.br");
    process.exit(1);
  }

  const usuarios = await prisma.usuario.findMany({
    where: { email: { endsWith: dominioAntigo } },
    select: { id: true, email: true },
  });

  if (usuarios.length === 0) {
    console.log(`Nenhum usuário com domínio "${dominioAntigo}". Nada a fazer.`);
    await prisma.$disconnect();
    return;
  }

  console.log(`Encontrados ${usuarios.length} usuário(s) com "${dominioAntigo}":`);
  for (const u of usuarios) {
    const novo = u.email.replace(dominioAntigo, dominioNovo);
    console.log(`  ${u.email}  →  ${novo}`);
  }

  // Atualiza usuarios + login events em transação.
  const updates = await prisma.$transaction(async (tx) => {
    let usuariosAtualizados = 0;
    for (const u of usuarios) {
      const novo = u.email.replace(dominioAntigo, dominioNovo);
      await tx.usuario.update({ where: { id: u.id }, data: { email: novo } });
      usuariosAtualizados++;
    }
    const eventos = await tx.loginEvent.findMany({
      where: { email: { endsWith: dominioAntigo } },
      select: { id: true, email: true },
    });
    for (const e of eventos) {
      const novo = e.email.replace(dominioAntigo, dominioNovo);
      await tx.loginEvent.update({ where: { id: e.id }, data: { email: novo } });
    }
    return { usuariosAtualizados, eventosAtualizados: eventos.length };
  });

  console.log("=".repeat(50));
  console.log(`✓ ${updates.usuariosAtualizados} usuário(s) atualizado(s)`);
  console.log(`✓ ${updates.eventosAtualizados} LoginEvent(s) atualizado(s)`);
  console.log("=".repeat(50));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
