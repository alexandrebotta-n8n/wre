// Recalcula cenários para refletir mudanças no engine.
//
// Comportamento:
//   - DRAFT com RemuneracaoCalculada existente → recalcula os 4 trimestres.
//   - DRAFT sem cálculo prévio → ignora (não há nada a atualizar).
//   - APPLIED / ARCHIVED → ignora (snapshot imutável). Lista no final.
//
// Uso:
//   npx tsx scripts/recalcular-cenarios.ts                    # local (.env)
//   DATABASE_URL="postgres://..." npx tsx scripts/recalcular-cenarios.ts   # prod
//
//   --dry-run       lista o que faria, sem executar
//   --only=<id>     recalcula apenas 1 cenário
//   --include-applied  reabre APPLIED como rascunho antes de recalcular (PERIGOSO)
import { prisma } from "../lib/prisma";
import { calcularCenario } from "../lib/cenario-service";

interface Args {
  dryRun: boolean;
  onlyId?: string;
  includeApplied: boolean;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const includeApplied = argv.includes("--include-applied");
  const onlyArg = argv.find((a) => a.startsWith("--only="));
  const onlyId = onlyArg?.split("=")[1];
  return { dryRun, onlyId, includeApplied };
}

async function main() {
  const args = parseArgs();
  console.log("=".repeat(70));
  console.log("Recálculo em massa de cenários");
  console.log("=".repeat(70));
  if (args.dryRun) console.log("Modo: DRY-RUN (nada será salvo)");
  if (args.onlyId) console.log(`Apenas cenário: ${args.onlyId}`);
  if (args.includeApplied) console.log("⚠️  Incluindo APPLIED — VAI ARQUIVAR e reabrir como rascunho");
  console.log("");

  // Snapshot dos cenários
  const cenarios = await prisma.cenario.findMany({
    where: args.onlyId ? { id: args.onlyId } : {},
    select: {
      id: true,
      nome: true,
      ano: true,
      modelo: true,
      status: true,
      _count: { select: { remuneracoes: true } },
    },
    orderBy: [{ status: "asc" }, { criadoEm: "desc" }],
    take: 500,
  });

  if (cenarios.length === 0) {
    console.log("Nenhum cenário encontrado.");
    return;
  }

  const draftsParaRecalcular = cenarios.filter(
    (c) => c.status === "DRAFT" && c._count.remuneracoes > 0,
  );
  const draftsSemCalculo = cenarios.filter(
    (c) => c.status === "DRAFT" && c._count.remuneracoes === 0,
  );
  const applied = cenarios.filter((c) => c.status === "APPLIED");
  const archived = cenarios.filter((c) => c.status === "ARCHIVED");

  console.log(`Encontrados ${cenarios.length} cenário(s):`);
  console.log(`  ${draftsParaRecalcular.length} DRAFT com cálculo prévio (alvos do recálculo)`);
  console.log(`  ${draftsSemCalculo.length} DRAFT sem cálculo (ignorados)`);
  console.log(`  ${applied.length} APPLIED (snapshot imutável — ignorados)`);
  console.log(`  ${archived.length} ARCHIVED (ignorados)`);
  console.log("");

  if (draftsParaRecalcular.length === 0 && !args.includeApplied) {
    console.log("Nada a recalcular.");
    return;
  }

  const ok: Array<{ id: string; nome: string }> = [];
  const erros: Array<{ id: string; nome: string; erro: string }> = [];

  for (const c of draftsParaRecalcular) {
    const tag = `[${c.modelo}/${c.ano}] ${c.nome} (${c.id})`;
    if (args.dryRun) {
      console.log(`DRY-RUN: recalcularia ${tag}`);
      continue;
    }
    try {
      await calcularCenario({ cenarioId: c.id });
      ok.push({ id: c.id, nome: c.nome });
      console.log(`  ✓ ${tag} → ok (anual)`);
    } catch (e) {
      const erro = e instanceof Error ? e.message : String(e);
      erros.push({ id: c.id, nome: c.nome, erro });
      console.log(`  ✗ ${tag} → ${erro}`);
    }
  }

  // APPLIED — apenas listar (não há fluxo automático seguro)
  if (applied.length > 0) {
    console.log("");
    console.log(`APPLIED não tocados (snapshot imutável). Para refletir o engine novo:`);
    console.log(`  1. Use "Reabrir como rascunho" na UI (cria DRAFT clone).`);
    console.log(`  2. Recalcule + Publique o clone.`);
    console.log(`  3. Cenários APPLIED do mesmo modelo/ano são auto-arquivados.`);
    console.log("");
    for (const c of applied) {
      console.log(`  - [${c.modelo}/${c.ano}] ${c.nome} (${c.id})`);
    }
  }

  console.log("");
  console.log("=".repeat(70));
  console.log(`Resumo: ${ok.length} ok, ${erros.length} erro(s).`);
  if (erros.length > 0) {
    console.log("");
    console.log("Erros:");
    for (const e of erros) console.log(`  - ${e.nome} (${e.id}): ${e.erro}`);
  }
}

main()
  .catch((e) => {
    console.error("Erro fatal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
