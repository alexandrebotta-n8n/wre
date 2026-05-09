// Seed inicial — popula DB com dados reais da DSF (1º trimestre 2026).
//
// Fontes:
//   - "Sistema ATUAL de Remuneração DSF — 1º trimestre 2026.xlsx"
//   - "Reclassificação de Sócios para Simulação.xlsx"
//
// Uso:
//   npm run seed
//
// Idempotente: usa upsert. Pode rodar múltiplas vezes.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ---------- Tabela salarial (planilha "Tabela Salarial Gestão") ----------
const TABELA_SALARIAL: Array<{
  nivel: "A" | "B" | "C" | "D";
  faixa: "INICIAL" | "PLENO" | "EXPERT";
  valor: number;
}> = [
  { nivel: "A", faixa: "INICIAL", valor: 9600 },
  { nivel: "A", faixa: "PLENO", valor: 12000 },
  { nivel: "A", faixa: "EXPERT", valor: 14400 },
  { nivel: "B", faixa: "INICIAL", valor: 8000 },
  { nivel: "B", faixa: "PLENO", valor: 10000 },
  { nivel: "B", faixa: "EXPERT", valor: 12000 },
  { nivel: "C", faixa: "INICIAL", valor: 6400 },
  { nivel: "C", faixa: "PLENO", valor: 8000 },
  { nivel: "C", faixa: "EXPERT", valor: 9600 },
  { nivel: "D", faixa: "INICIAL", valor: 5600 },
  { nivel: "D", faixa: "PLENO", valor: 7000 },
  { nivel: "D", faixa: "EXPERT", valor: 8400 },
];

// ---------- Sócios reais (planilha 1T2026) ----------
const SOCIOS = [
  // Fundadores — recebem da unidade BG
  { nome: "Jose Décio Dupont", cargo: "Fundador", quotas: 0.14871, isFundador: true, nivel: null, faixa: null },
  { nome: "Gilberto Antonio Spiller", cargo: "Fundador", quotas: 0.14871, isFundador: true, nivel: null, faixa: null },
  // Demais sócios — todos com cargo de gestão e quota
  { nome: "Alessandro Spiller", cargo: "CEO", quotas: 0.13184, isFundador: false, nivel: "A", faixa: "INICIAL" },
  { nome: "Jose Claudio Fadanelli", cargo: "Diretor Exec. Novos Negócios / CE", quotas: 0.115374, isFundador: false, nivel: "B", faixa: "INICIAL" },
  { nome: "Ronei Giacomoni", cargo: "Diretor Exec. Comercial e Marketing / CE", quotas: 0.09161, isFundador: false, nivel: "B", faixa: "INICIAL" },
  { nome: "Ricardo Abel Guarnieri", cargo: "Diretor Exec. Intel. Jurídica e Relações Institucionais / CE", quotas: 0.06186, isFundador: false, nivel: "B", faixa: "INICIAL" },
  { nome: "Tiago Alves", cargo: "Diretor Exec. Operações / CE", quotas: 0.04503, isFundador: false, nivel: "B", faixa: "INICIAL" },
  { nome: "Leandro Jose Caon", cargo: "Gestor Direito Tributário", quotas: 0.06186, isFundador: false, nivel: "C", faixa: "INICIAL" },
  { nome: "Bárbara Ravanello", cargo: "Gestora Direito Digital e TI", quotas: 0.02326, isFundador: false, nivel: "C", faixa: "INICIAL" },
  { nome: "Jonathan Piva de Almeida", cargo: "Gestor Direito Societário", quotas: 0.024723, isFundador: false, nivel: "C", faixa: "INICIAL" },
  { nome: "Fabio Stefani", cargo: "Gestor Direito Internacional", quotas: 0.02326, isFundador: false, nivel: "C", faixa: "INICIAL" },
  { nome: "Guilherme Spiller", cargo: "Gestor Direito Agro", quotas: 0.06186, isFundador: false, nivel: "D", faixa: "INICIAL" },
  { nome: "Gabriel Fontanive Dupont", cargo: "Gestor Inovação", quotas: 0.03718, isFundador: false, nivel: "D", faixa: "INICIAL" },
  { nome: "Keila Reichert", cargo: "Gestora Governança", quotas: 0.024723, isFundador: false, nivel: "D", faixa: "INICIAL" },
] as const;

const LIDERES_TECNICOS = Array.from({ length: 8 }, (_, i) => ({
  nome: `Líder Técnico ${i + 1}`, cargo: "Líder Técnico", quotas: 0, isFundador: false, nivel: null, faixa: null,
}));

const LIDER_UNIDADE = [
  { nome: "Líder Unidade 1", cargo: "Líder de Unidade", quotas: 0, isFundador: false, nivel: null, faixa: null },
];

// ---------- Premissas ----------
const PREMISSA_ATUAL_PARAMS = {
  proLaboreMensal: 5000,
  unidadeFundadores: "BG",
  unidadeMatriz: "DSF",
  reservaPercentual: 0.05,
  reservaViraPremio: true,
  publicosElegiveisPremio: ["SOCIO_CAPITAL", "SOCIO_CAPITAL_GESTOR"],
  // tabelaSalarial é resolvida em runtime a partir do banco
};

const PREMISSA_NOVO_PARAMS = {
  percentualBlocoA: 0.45,
  percentualBlocoB: 0.35,
  percentualBlocoC: 0.20,
  poolSociedade: 0.50,
  poolLider: 0.30,
  poolEquipeReserva: 0.20,
  chaveOriginacao: 0.30,
  chaveExecucao: 0.60,
  chaveGestaoCP: 0.10,
  faixaOrigMin: 0.20, faixaOrigMax: 0.40,
  faixaExecMin: 0.50, faixaExecMax: 0.70,
  faixaGestaoMin: 0.00, faixaGestaoMax: 0.15,
  proRataMinMeses: 3,
};

async function main() {
  console.log("→ Seed iniciando...");

  // Tabela salarial
  for (const t of TABELA_SALARIAL) {
    await prisma.tabelaSalario.upsert({
      where: { nivel_faixa: { nivel: t.nivel, faixa: t.faixa } },
      create: t,
      update: { valor: t.valor },
    });
  }
  console.log(`  ✓ Tabela salarial (${TABELA_SALARIAL.length} entradas)`);

  // Unidades
  const dsf = await prisma.unidade.upsert({
    where: { codigo: "DSF" },
    create: { codigo: "DSF", nome: "DSF Consolidado", isMatriz: true },
    update: {},
  });
  const bg = await prisma.unidade.upsert({
    where: { codigo: "BG" },
    create: { codigo: "BG", nome: "Bento Gonçalves", isMatriz: false },
    update: {},
  });
  console.log("  ✓ Unidades: DSF (matriz) + BG");

  // Sócios + líderes
  const todos = [...SOCIOS, ...LIDERES_TECNICOS, ...LIDER_UNIDADE];
  for (const s of todos) {
    await prisma.socio.upsert({
      where: { nome: s.nome },
      create: {
        nome: s.nome,
        cargo: s.cargo,
        percentualQuotasDefault: s.quotas,
        isFundador: s.isFundador,
        nivelCargo: s.nivel as never,
        faixaSalarial: s.faixa as never,
      },
      update: {},
    });
  }
  console.log(`  ✓ ${todos.length} sócios/líderes (${SOCIOS.length} sócios + ${LIDERES_TECNICOS.length} líderes técnicos + ${LIDER_UNIDADE.length} líder unidade)`);

  // Períodos: 1T2026 e 2026
  const tri1_2026 = await prisma.periodo.upsert({
    where: { tipo_ano_trimestre: { tipo: "TRIMESTRE", ano: 2026, trimestre: 1 } },
    create: { tipo: "TRIMESTRE", ano: 2026, trimestre: 1, rotulo: "1T2026" },
    update: {},
  });
  // ANO 2026 — sem trimestre. Compound unique não suporta null bem,
  // então usamos findFirst + create.
  const existeAno = await prisma.periodo.findFirst({
    where: { tipo: "ANO", ano: 2026, trimestre: null },
  });
  if (!existeAno) {
    await prisma.periodo.create({ data: { tipo: "ANO", ano: 2026, rotulo: "2026" } });
  }
  console.log("  ✓ Períodos: 1T2026 + 2026");

  // ResultadoPeriodo: 1T2026 real
  await prisma.resultadoPeriodo.upsert({
    where: { unidadeId_periodoId: { unidadeId: dsf.id, periodoId: tri1_2026.id } },
    create: {
      unidadeId: dsf.id,
      periodoId: tri1_2026.id,
      lucroLiquido: 1394712.16,
      ehReal: true,
      fonte: "1T2026 oficial — planilha DSF",
    },
    update: {},
  });
  await prisma.resultadoPeriodo.upsert({
    where: { unidadeId_periodoId: { unidadeId: bg.id, periodoId: tri1_2026.id } },
    create: {
      unidadeId: bg.id,
      periodoId: tri1_2026.id,
      lucroLiquido: 1041022.54,
      fundingVariavel: 881598,
      ehReal: true,
      fonte: "1T2026 oficial — planilha DSF",
    },
    update: {},
  });
  console.log("  ✓ Resultados 1T2026: LL DSF=1.394.712,16 / LL BG=1.041.022,54 (funding=881.598)");

  // Premissas
  await prisma.premissa.upsert({
    where: { nome: "Sistema 1T2026 (ATUAL)" },
    create: {
      nome: "Sistema 1T2026 (ATUAL)",
      descricao: "Replica fielmente a planilha do 1º trimestre 2026.",
      modelo: "ATUAL",
      parametros: PREMISSA_ATUAL_PARAMS,
    },
    update: { parametros: PREMISSA_ATUAL_PARAMS },
  });
  await prisma.premissa.upsert({
    where: { nome: "Política DSF v1 (NOVO)" },
    create: {
      nome: "Política DSF v1 (NOVO)",
      descricao: "Blocos A/B/C 45/35/20, pool 50/30/20, chave 30/60/10.",
      modelo: "NOVO",
      parametros: PREMISSA_NOVO_PARAMS,
    },
    update: { parametros: PREMISSA_NOVO_PARAMS },
  });
  console.log("  ✓ Premissas: Sistema 1T2026 (ATUAL) + Política DSF v1 (NOVO)");

  // Usuário admin (senha provisória)
  const adminEmail = "admin@wre.local";
  const adminHash = await bcrypt.hash("trocar-em-producao", 10);
  await prisma.usuario.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      nome: "Admin WRE",
      senhaHash: adminHash,
      // Senha provisória: usuário será forçado a trocar no primeiro login
      // (página /perfil/senha existe e é o destino do middleware).
      senhaProvisoria: true,
      roles: ["ADMIN", "CONSULTOR"],
      ativo: true,
    },
    update: {},
  });
  console.log(`  ✓ Usuário admin: ${adminEmail} (senha: trocar-em-producao — provisória)`);

  console.log("→ Seed concluído.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
