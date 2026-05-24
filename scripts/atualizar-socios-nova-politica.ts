// Aplica o de/para da planilha "Dados Sócios para Simulador.xlsx" no DB.
// Idempotente — pode rodar várias vezes. Atualiza:
//   - publicoDefault (NOVA política)
//   - publicoAtual (preserva ATUAL quando difere)
//   - remuneracaoGestaoMensal (override individual mensal)
//   - blocoBNumSalariosAlvo (alvo Bloco B modo ALVO_NUM_SALARIOS)
//
// Marca todos cenários DRAFT como dirty no final pra forçar recálculo.
//
// Uso:
//   npx tsx scripts/atualizar-socios-nova-politica.ts
//   DATABASE_URL="postgres://..." npx tsx scripts/atualizar-socios-nova-politica.ts
import { prisma } from "../lib/prisma";

type Mapping = {
  nome: string;
  publicoDefault?: "SOCIO_CAPITAL" | "SOCIO_CAPITAL_GESTOR" | "SOCIO_CAPITAL_LIDER_UNIDADE" | "SOCIO_SERVICOS" | "SOCIO_SERVICOS_ESTRATEGICO" | "LIDER_UNIDADE_NON_EQUITY";
  publicoAtual?: "SOCIO_CAPITAL" | "SOCIO_CAPITAL_GESTOR" | "SOCIO_CAPITAL_LIDER_UNIDADE" | "SOCIO_SERVICOS" | "SOCIO_SERVICOS_ESTRATEGICO" | "LIDER_UNIDADE_NON_EQUITY" | "LIDER_TECNICO" | null;
  remuneracaoGestaoMensal?: number;
  blocoBNumSalariosAlvo?: number;
};

// 6 Capital-Gestor que continuam na NOVA política — força publicoDefault
// (cadastro do seed pode estar com SOCIO_SERVICOS por engano) + alvo Bloco B.
const CAPITAL_GESTOR: Mapping[] = [
  { nome: "Alessandro Spiller", publicoDefault: "SOCIO_CAPITAL_GESTOR", remuneracaoGestaoMensal: 9600, blocoBNumSalariosAlvo: 20 },
  { nome: "Jose  Claudio Fadanelli", publicoDefault: "SOCIO_CAPITAL_GESTOR", remuneracaoGestaoMensal: 8000, blocoBNumSalariosAlvo: 15 },
  { nome: "Ronei Giacomoni", publicoDefault: "SOCIO_CAPITAL_GESTOR", remuneracaoGestaoMensal: 8000, blocoBNumSalariosAlvo: 15 },
  { nome: "Ricardo Abel Guarnieri", publicoDefault: "SOCIO_CAPITAL_GESTOR", remuneracaoGestaoMensal: 8000, blocoBNumSalariosAlvo: 15 },
  { nome: "Tiago Alves", publicoDefault: "SOCIO_CAPITAL_GESTOR", remuneracaoGestaoMensal: 8000, blocoBNumSalariosAlvo: 15 },
  { nome: "Leandro Jose Caon", publicoDefault: "SOCIO_CAPITAL_GESTOR", remuneracaoGestaoMensal: 6400, blocoBNumSalariosAlvo: 15 },
];

// 6 ex-Capital-Gestor que viraram Sócios de Serviço na NOVA política.
// publicoAtual=SOCIO_CAPITAL_GESTOR preserva o cálculo da política ATUAL.
const EX_CAPITAL_VIRA_SERVICOS: Mapping[] = [
  { nome: "Bárbara Ravanello", publicoDefault: "SOCIO_SERVICOS", publicoAtual: "SOCIO_CAPITAL_GESTOR", remuneracaoGestaoMensal: 11400, blocoBNumSalariosAlvo: 10 },
  { nome: "Jonathan Piva de Almeida", publicoDefault: "SOCIO_SERVICOS", publicoAtual: "SOCIO_CAPITAL_GESTOR", remuneracaoGestaoMensal: 11400, blocoBNumSalariosAlvo: 10 },
  { nome: "Fabio Stefani", publicoDefault: "SOCIO_SERVICOS", publicoAtual: "SOCIO_CAPITAL_GESTOR", remuneracaoGestaoMensal: 11400, blocoBNumSalariosAlvo: 10 },
  { nome: "Guilherme Spiller", publicoDefault: "SOCIO_SERVICOS", publicoAtual: "SOCIO_CAPITAL_GESTOR", remuneracaoGestaoMensal: 10600, blocoBNumSalariosAlvo: 10 },
  { nome: "Gabriel Fontanive Dupont", publicoDefault: "SOCIO_SERVICOS", publicoAtual: "SOCIO_CAPITAL_GESTOR", remuneracaoGestaoMensal: 10600, blocoBNumSalariosAlvo: 10 },
  { nome: "Keila Reichert", publicoDefault: "SOCIO_SERVICOS", publicoAtual: "SOCIO_CAPITAL_GESTOR", remuneracaoGestaoMensal: 10600, blocoBNumSalariosAlvo: 10 },
];

// 7 Líderes Técnicos (já migrados — só ajusta alvo Bloco B).
const LIDERES_TECNICOS: Mapping[] = [
  { nome: "Bruna Licks", blocoBNumSalariosAlvo: 10 },
  { nome: "Samuel Almeida", blocoBNumSalariosAlvo: 10 },
  { nome: "Bruna Franceschi", blocoBNumSalariosAlvo: 10 },
  { nome: "Juliana Pereto", blocoBNumSalariosAlvo: 10 },
  { nome: "Francieli Toretti", blocoBNumSalariosAlvo: 10 },
  { nome: "Silvia Scomazzon", blocoBNumSalariosAlvo: 10 },
  { nome: "Luiza Moulin", blocoBNumSalariosAlvo: 10 },
];

const TODOS = [...CAPITAL_GESTOR, ...EX_CAPITAL_VIRA_SERVICOS, ...LIDERES_TECNICOS];

async function main() {
  let atualizados = 0;
  const naoEncontrados: string[] = [];

  // Busca por nome — pode ter espaços extras na planilha; tentamos nome exato e
  // também variantes trimmed.
  // Normaliza espaços duplos/laterais (planilha pode ter " " extras).
  const normalize = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
  const todosSocios = await prisma.socio.findMany({ select: { id: true, nome: true } });
  const byNormName = new Map(todosSocios.map((s) => [normalize(s.nome), s]));

  for (const m of TODOS) {
    const socio = byNormName.get(normalize(m.nome));
    if (!socio) {
      naoEncontrados.push(m.nome);
      continue;
    }
    const data: Record<string, unknown> = {};
    if (m.publicoDefault !== undefined) data.publicoDefault = m.publicoDefault;
    if (m.publicoAtual !== undefined) data.publicoAtual = m.publicoAtual;
    if (m.remuneracaoGestaoMensal !== undefined) data.remuneracaoGestaoMensal = m.remuneracaoGestaoMensal;
    if (m.blocoBNumSalariosAlvo !== undefined) data.blocoBNumSalariosAlvo = m.blocoBNumSalariosAlvo;
    await prisma.socio.update({ where: { id: socio.id }, data });
    atualizados++;
    console.log(`  ${socio.nome} → ${JSON.stringify(data)}`);
  }

  if (naoEncontrados.length > 0) {
    console.error(`\n⚠ Não encontrados (${naoEncontrados.length}):`);
    for (const n of naoEncontrados) console.error(`    ${n}`);
  }

  // Ressincroniza classificações dos DRAFTs com publicoDefault/publicoAtual atualizado.
  // Para sócios que mudaram de público (ex: Capital-Gestor → Sócio de Serviço),
  // as ClassificacaoSocio antigas dos cenários DRAFT precisam acompanhar.
  const sociosAtualizados = await prisma.socio.findMany({
    where: { nome: { in: TODOS.map((m) => byNormName.get(normalize(m.nome))?.nome).filter((x): x is string => !!x) } },
    select: { id: true, nome: true, publicoDefault: true, publicoAtual: true },
  });
  const drafts = await prisma.cenario.findMany({
    where: { status: "DRAFT" },
    select: { id: true, modelo: true, nome: true },
  });
  let classifUpdates = 0;
  for (const cenario of drafts) {
    for (const socio of sociosAtualizados) {
      const publicoCorreto =
        cenario.modelo === "ATUAL"
          ? (socio.publicoAtual ?? socio.publicoDefault)
          : socio.publicoDefault;
      const u = await prisma.classificacaoSocio.updateMany({
        where: { cenarioId: cenario.id, socioId: socio.id, publico: { not: publicoCorreto } },
        data: { publico: publicoCorreto },
      });
      classifUpdates += u.count;
    }
  }

  // Marca DRAFTs como dirty
  const r = await prisma.cenario.updateMany({
    where: { status: "DRAFT" },
    data: { parametrosDirty: true },
  });
  console.log(`\n✓ ${atualizados} sócios atualizados; ${classifUpdates} classificações ressincronizadas; ${r.count} cenário(s) DRAFT marcado(s) pra recalcular.`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
