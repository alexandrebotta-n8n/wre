// Renomeia os 8 "Líder Técnico N" genéricos do seed para os 7 nomes reais
// + desativa o 8º. Idempotente — pode rodar várias vezes sem efeito colateral.
//
// Uso:
//   npx tsx scripts/migrar-lideres-tecnicos.ts                # base local
//   DATABASE_URL="postgres://..." npx tsx scripts/migrar-lideres-tecnicos.ts
//
// Estratégia: busca os Sócios por nome "Líder Técnico %" ordenados, e
// substitui in-place pelos nomes reais — preserva IDs e ClassificacaoSocio
// existentes nos cenários DRAFT/APPLIED (snapshot APPLIED não é afetado
// pelo rename pois mostra socioNome via snapshot.classificacoes).
import { prisma } from "../lib/prisma";

const LIDERES = [
  { nome: "Bruna Licks", salario: 10405 },
  { nome: "Samuel Almeida", salario: 10405 },
  { nome: "Bruna Franceschi", salario: 11211 },
  { nome: "Juliana Pereto", salario: 12052 },
  { nome: "Francieli Toretti", salario: 7480 },
  { nome: "Silvia Scomazzon", salario: 13141 },
  { nome: "Luiza Moulin", salario: 13141 },
];

async function main() {
  // Caso 1: já migrado — busca pelos nomes reais e ajusta o que faltar.
  const jaExistem = await prisma.socio.findMany({
    where: { nome: { in: LIDERES.map((l) => l.nome) } },
  });
  if (jaExistem.length === LIDERES.length) {
    console.log(`→ ${LIDERES.length} líderes já existem com nomes reais. Sincronizando campos...`);
    for (const l of LIDERES) {
      await prisma.socio.update({
        where: { nome: l.nome },
        data: {
          cargo: "Líder Técnico",
          publicoDefault: "SOCIO_SERVICOS",
          publicoAtual: "LIDER_TECNICO",
          remuneracaoGestaoMensal: l.salario,
          percentualQuotasDefault: 0,
          isFundador: false,
          ativo: true,
        },
      });
    }
    console.log(`✓ ${LIDERES.length} líderes sincronizados.`);
    await prisma.$disconnect();
    return;
  }

  // Caso 2: ainda tem "Líder Técnico N" genéricos — renomeia in-place.
  const genericos = await prisma.socio.findMany({
    where: { nome: { startsWith: "Líder Técnico " } },
    orderBy: [{ nome: "asc" }],
  });
  if (genericos.length < LIDERES.length) {
    console.error(
      `✗ Esperava encontrar ${LIDERES.length} "Líder Técnico N" genéricos no DB; ` +
      `encontrei ${genericos.length}. Verifique se o seed rodou ou se já foi migrado parcialmente.`,
    );
    process.exit(1);
  }

  console.log(`→ Encontrei ${genericos.length} "Líder Técnico N". Renomeando ${LIDERES.length} primeiros...`);
  for (let i = 0; i < LIDERES.length; i++) {
    const g = genericos[i];
    const l = LIDERES[i];
    await prisma.socio.update({
      where: { id: g.id },
      data: {
        nome: l.nome,
        cargo: "Líder Técnico",
        publicoDefault: "SOCIO_SERVICOS",
        publicoAtual: "LIDER_TECNICO",
        remuneracaoGestaoMensal: l.salario,
        percentualQuotasDefault: 0,
        isFundador: false,
        ativo: true,
      },
    });
    console.log(`  ${g.nome} → ${l.nome} (R$ ${l.salario}/mês)`);
  }

  // Desativa o 8º (e quaisquer outros remanescentes).
  const restantes = genericos.slice(LIDERES.length);
  for (const r of restantes) {
    await prisma.socio.update({ where: { id: r.id }, data: { ativo: false } });
    console.log(`  ${r.nome} → desativado (ativo=false)`);
  }

  console.log(`✓ Migração concluída: ${LIDERES.length} renomeados, ${restantes.length} desativados.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
