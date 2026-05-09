# WRE Simulador

Simulador de remuneração de sócios e líderes — desenvolvido pela **WRE Consultoria** para a **DSF (Dupont Spiller & Fadanelli Advogados Associados)**.

> **Antes de mexer no código, leia [`AGENTS.md`](./AGENTS.md).** Lá estão as regras de negócio (Política DSF v1), decisões arquiteturais, padrões de código e anti-padrões.

## Propósito

Apoiar a deliberação dos sócios da DSF sobre o novo modelo de partnership e remuneração:

- **Modelo ATUAL** — replica o sistema de remuneração do 1º trimestre 2026.
- **Modelo NOVO** — Política DSF v1: Blocos A/B/C + Pool de Unidade + Créditos Interunidades.

Insumos: lucro líquido por unidade × período (trimestral/anual). Saída: pacote anual por sócio + comparativo entre modelos.

## Stack

Next.js 16 · React 19 · TypeScript · Prisma 6 / PostgreSQL · Auth.js v5 · TailwindCSS 4 · shadcn/ui · Vitest · Playwright

## Quickstart

```bash
# 1. Dependências
npm install

# 2. Variáveis de ambiente
cp .env.example .env
# edite DATABASE_URL e AUTH_SECRET (openssl rand -base64 32)

# 3. Banco (precisa de Postgres rodando)
npm run db:migrate

# 4. Dev server
npm run dev          # http://localhost:3000
```

## Testes

```bash
npm run test:unit              # rápido, sem DB (engines puros)
npm run test:db:up             # sobe Postgres em :5434
npm run test:int               # integration tests
npm run test:db:down           # derruba Postgres
npm run test:e2e               # Playwright
```

Guardrail: `tests/helpers/db.ts` aborta se `DATABASE_URL` não contém `"_test"`.

## Estrutura

Veja `AGENTS.md` §3 (Arquitetura em camadas) para detalhes.

```
app/                  Next.js (UI + API routes)
lib/
  domain/dsf/         Engines de cálculo (modelo-atual + modelo-novo) — puro
  domain/calc/        Utilitários genéricos (multiplicador piecewise)
  domain/cenario/     State machine de cenário
  auth/               Guards e session helpers
  audit/              Logger + safeMeta
  prisma.ts           Singleton
prisma/               Schema + migrations
tests/                unit/ + integration/ + helpers/
e2e/                  Playwright
```

## Confidencialidade

A Política de Partnership DSF (cláusula 17.4) impõe sigilo de **5 anos pós-término** sobre dados de remuneração e estrutura societária. Auditoria + redação de PII em logs são **obrigatórias**.

## Próximos passos

Veja `AGENTS.md` §13.
