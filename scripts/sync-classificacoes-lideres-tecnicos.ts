// Sincroniza ClassificacaoSocio dos cenários DRAFT existentes com o novo
// campo Socio.publicoAtual. APPLIED nunca é tocado (snapshot imutável).
//
// Uso:
//   npx tsx scripts/sync-classificacoes-lideres-tecnicos.ts
//   DATABASE_URL="postgres://..." npx tsx scripts/sync-classificacoes-lideres-tecnicos.ts
//
// Para cada sócio com publicoAtual != null:
//   - cenários DRAFT modelo ATUAL → ClassificacaoSocio.publico = publicoAtual
//   - cenários DRAFT modelo NOVO  → ClassificacaoSocio.publico = publicoDefault
// Marca os DRAFTs como dirty pra forçar recálculo na próxima sessão.
import { prisma } from "../lib/prisma";

async function main() {
  const sociosComOverride = await prisma.socio.findMany({
    where: { publicoAtual: { not: null } },
    select: { id: true, nome: true, publicoDefault: true, publicoAtual: true },
  });
  if (sociosComOverride.length === 0) {
    console.log("→ Nenhum sócio com publicoAtual setado. Nada a sincronizar.");
    await prisma.$disconnect();
    return;
  }
  console.log(`→ ${sociosComOverride.length} sócios com publicoAtual override:`);
  for (const s of sociosComOverride) {
    console.log(`  ${s.nome}: NOVO=${s.publicoDefault} / ATUAL=${s.publicoAtual}`);
  }

  const drafts = await prisma.cenario.findMany({
    where: { status: "DRAFT" },
    select: { id: true, nome: true, modelo: true, ano: true },
  });
  console.log(`\n→ ${drafts.length} cenários DRAFT encontrados.`);

  let updates = 0;
  const draftIdsAfetados = new Set<string>();
  for (const cenario of drafts) {
    for (const socio of sociosComOverride) {
      const publicoCorreto =
        cenario.modelo === "ATUAL" ? socio.publicoAtual! : socio.publicoDefault;
      const r = await prisma.classificacaoSocio.updateMany({
        where: { cenarioId: cenario.id, socioId: socio.id, publico: { not: publicoCorreto } },
        data: { publico: publicoCorreto },
      });
      if (r.count > 0) {
        updates += r.count;
        draftIdsAfetados.add(cenario.id);
        console.log(`  [${cenario.modelo}] ${cenario.nome}: ${socio.nome} → ${publicoCorreto}`);
      }
    }
  }

  if (draftIdsAfetados.size > 0) {
    await prisma.cenario.updateMany({
      where: { id: { in: Array.from(draftIdsAfetados) } },
      data: { parametrosDirty: true },
    });
    console.log(`\n✓ ${updates} classificação(ões) atualizada(s) em ${draftIdsAfetados.size} cenário(s) DRAFT (marcados como dirty pra recalcular).`);
  } else {
    console.log("\n✓ Tudo já estava sincronizado.");
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
