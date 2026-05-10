# AGENTS.md — Guia de Arquitetura e Boas Práticas

**Projeto**: WRE Simulador — Simulação de Remuneração de Sócios e Líderes
**Cliente final**: **DSF — Dupont Spiller & Fadanelli Advogados Associados**
**Desenvolvido por**: **WRE Consultoria** (Pessoas, Governança e Incentivos)
**Tipo**: aplicação **single-tenant**, uso interno

> **Para todos os agentes (humanos e IA) que tocarem este código**: leia este documento antes de propor mudanças. Ele encapsula decisões arquiteturais, regras de negócio da Política de Partnership DSF e anti-padrões mapeados. Atualize este arquivo quando uma decisão estrutural mudar.

---

## 1. Visão geral & propósito

O simulador apoia a **deliberação dos sócios da DSF** sobre o novo modelo de partnership e remuneração (Política DSF v1, Etapa 2 do trabalho da WRE).

Funcionalidades centrais:

1. **Simular o pacote anual de remuneração** de cada sócio/líder sob diferentes regras.
2. **Comparar dois modelos de regras lado a lado**:
   - **Modelo ATUAL** — replica o sistema do 1º trimestre 2026 (planilha "Sistema ATUAL de Remuneração DSF").
   - **Modelo NOVO** — Política DSF v1: Blocos A/B/C + Pool de Unidade + Créditos Interunidades.
3. **Reclassificar sócios** entre os 6 públicos do novo modelo e ver o impacto.
4. **Salvar premissas como templates reutilizáveis** (pesos, percentuais, faixas de ajuste).
5. **Validar não-sobreposição** automaticamente: alertar quando um sócio recebe dois mecanismos sobre o mesmo fato gerador.

**O que este simulador NÃO faz** (decisão explícita):

- ❌ Não importa DRE hierárquica completa (3 níveis de classificação/projeto/linha).
- ❌ Não faz forecast por linha do DRE.
- ❌ Não calcula bonificação para colaboradores não-sócios.

Insumos financeiros mínimos: **Lucro Líquido por unidade × período** (ex: LL Consolidado DSF + LL Unidade BG, por trimestre e ano).

---

## 2. Domínio DSF (regras de negócio)

### 2.1 Os 6 públicos (Política DSF v1)

| Código (enum) | Nome | Pacote default | Restrição crítica |
|---|---|---|---|
| `SOCIO_CAPITAL` | Sócio de Capital | Pró-labore + Bloco A + Bloco B | Núcleo do equity |
| `SOCIO_CAPITAL_GESTOR` | Sócio de Capital — Gestor | Sócio Capital + Remuneração de Administração | Função formal de gestão institucional |
| `SOCIO_CAPITAL_LIDER_UNIDADE` | Sócio de Capital — Líder de unidade | Sócio Capital + Pool de Unidade | Líder formal |
| `SOCIO_SERVICOS` | Sócio de Serviços (Non-Equity) | Pró-labore + Bloco B | Sem Bloco A, sem haveres |
| `SOCIO_SERVICOS_ESTRATEGICO` | Sócio de Serviços Estratégico | Sócio Serviços + metas estratégicas | Carteira/expansão |
| `LIDER_UNIDADE_NON_EQUITY` | Líder de Unidade Non-Equity | Pró-labore + Bloco B + Pool | Sem Bloco A |

Categorias auxiliares:
- `LIDER_TECNICO` — categoria transitória (mapeada a Sócio de Serviços na proposta nova).
- `FUNDADOR` — categoria especial do Modelo Atual (recebe % sobre LL da unidade fundadora).

### 2.2 Mecanismos econômicos (parâmetros oficiais)

**Modelo NOVO (Política DSF v1)** — sobre Resultado Distribuível Ajustado (RDA):

- **Bloco A — Institucional: 45%** (só Sócios de Capital)
- **Bloco B — Performance: 35%** (Capital + Serviços conforme avaliação)
- **Bloco C — Estratégico/LP: 20%** (excepcional, retido como reserva)

**Pool de Unidade** sobre Resultado Líquido da Unidade:

- **50%** Sociedade · **30%** Líder · **20%** equipe/reserva local

**Alocação interunidades — chave-padrão híbrida**:

- Originação **30%** (faixa 20–40%) · Execução **60%** (50–70%) · Gestão CP **10%** (0–15%)

**Modelo ATUAL** (planilha 1T2026):

- Pró-labore: R$ 5.000/mês por sócio elegível (líderes técnicos não recebem)
- **Fundadores** (Décio, Gilberto): cada um recebe `quota × funding_BG` (sem normalização — usa-se o `fundingVariavel` da unidade BG, ex: R$ 881.598). Total dos fundadores ≈ R$ 262.204,88.
- **Funding DSF residual** = `LL_DSF − Σ(rem.fundadores)` (ex: 1.394.712,16 − 262.204,88 = 1.132.507,28). **Pró-labore e rem.gestão NÃO são deduzidos novamente** — já estão no LL como despesa.
- **Reserva** = `funding_DSF × 5%` (≈ R$ 56.625,36).
- **Distribuição sócios não-fund** = `funding_DSF × 95%`, rateada por `(quota / Σquotas_nãoFund)`. Total ≈ R$ 1.075.881,92.
- **Prêmio de performance**: a reserva, quando `reservaViraPremio=true`, é distribuída **uniformemente** entre sócios elegíveis (ex: 12 sócios × R$ 4.718,78 = R$ 56.625,36). Configurável.
- Remuneração de gestão: tabela A/B/C/D × Inicial/Pleno/Expert (mensal)
- **Total "1º TRIM" da planilha** (rem.gestão + fundadores + distribuição+prêmio) ≈ R$ 1.590.086,80. Não inclui pró-labore, que é despesa contabilizada à parte.

### 2.3 Tabela salarial de gestão (mensal em BRL)

| Nível | Cargos | Inicial (0.8) | Pleno (1.0) | Expert (1.2) |
|---|---|---|---|---|
| **A** | CEO | 9.600 | 12.000 | 14.400 |
| **B** | Diretores Executivos | 8.000 | 10.000 | 12.000 |
| **C** | Gestores Sr. (Trib, Inov, Internac, Soc) | 6.400 | 8.000 | 9.600 |
| **D** | Gestores (Agro, Digital/TI, Governança) | 5.600 | 7.000 | 8.400 |

A pontuação de cargo (5 fatores × 3 níveis = 50–150) é **dado de entrada** no `Socio` — não é calculada pelo simulador.

### 2.4 Ordem oficial de apuração ("Mapa Econômico")

Toda simulação respeita esta sequência (referência: §3 do Relatório Etapa 1):

```
1. Receita / resultado bruto                  (input: lucroLiquido por unidade)
2. Deduções obrigatórias                      (assumido já líquido no input)
3. Remuneração de Administração               (CUSTO, ANTES da distribuição)
4. Resultado Líquido por Unidade              (input)
5. Alocação interunidades (orig/exec/gestão)  (futuro: requer cadastro de projetos)
6. Pools locais (50/30/20)                    (sobre LL_unidade)
7. RDA central                                (LL_DSF − admin − parcela cedida)
8. Blocos A/B/C (45/35/20)                    (sobre RDA)
9. Ajustes finais individuais                 (buy-in, retenções, diferimentos)
```

### 2.5 Regra sistêmica de não-sobreposição

**Cada fato gerador econômico tem UM mecanismo principal.** Acumulações são exceção, justificadas e aprovadas pela governança.

Implementado em `lib/domain/dsf/regras-sobreposicao.ts` — gera alertas:
- `INFO` — informativo (ex: Bloco C aplicado)
- `WARNING` — exige base limpa documentada (ex: Bloco B + Pool)
- `ERROR` — combinação proibida (ex: Bloco A para Non-Equity)

---

## 3. Arquitetura em camadas

### Rotas (UI)

A página principal é **`/simulacao`** — combina lista de cenários + comparação A×B + edição de parâmetros + classificações + apresentação. Substitui as antigas `/cenarios`, `/cenarios/[id]`, `/cenarios/comparar` (que viraram redirects 308).

| Rota | Propósito |
|---|---|
| `/simulacao?a=&b=&periodoId=` | **Página única.** 2 colunas (A | B) com painéis de parâmetros editáveis, stepper, KPIs, tabela alinhada por sócio com Δ. Drawer lateral = lista de cenários filtrada. |
| `/socios` | Base — sócios e líderes ativos. |
| `/premissas` | Catálogo de templates (params iniciais para novos cenários). Mostra count "N cenários usando". |
| `/premissas/[id]` | Editor da premissa-template + histórico de versões. |
| `/usuarios` | ADMIN — gestão de acessos. |
| `/perfil/senha` | Troca de senha (forçada quando provisória). |
| `/apresentacao?a=&b=&periodoId=` | Modo slide deck (acessado via botão "▶ Apresentar" da Simulação). |

```
app/                  Next.js App Router (UI + route handlers)
  api/                Route handlers (validados com Zod, autenticados)
  simulacao/          Página única (page + acoes Server Actions)
  (rotas de UI)/      Outras páginas server-side por feature

lib/
  domain/             Lógica pura — testável SEM Prisma, SEM Next, SEM rede
    dsf/              Engines de cálculo (modelo-atual.ts, modelo-novo.ts) +
                      tipos puros + validador de não-sobreposição
    calc/             Utilitários genéricos (multiplicador piecewise — caso
                      Bloco B venha a ter curva de meta no futuro)
    cenario/          State machine DRAFT/APPLIED/ARCHIVED, snapshot
  infra/              Adapters: cache, telemetria
  auth/               Helpers + guards (requireSession, requireRole)
  audit/              safeMeta + AuditLog writer (redaction reforçada)
  schemas/            Zod schemas (compartilhados client/server)
  prisma.ts           Singleton PrismaClient

components/           UI (shadcn/ui primitives + features)
prisma/               schema.prisma + migrations
tests/
  unit/               Vitest puro (lib/domain/**)
  integration/        Vitest + Postgres :5434 (route handlers, repos)
  helpers/            seed, db reset (com guardrail "_test")
e2e/                  Playwright (caminhos críticos)
scripts/              CLIs (seed, importar planilha 1T2026, etc.)
```

**Regra de ouro**: `lib/domain/` **NUNCA** importa Prisma, Next, fs, axios. Recebe dados de entrada, devolve dados de saída.

---

## 4. Modelo de dados — princípios

Veja `prisma/schema.prisma`. Princípios:

- **Single-tenant** — sem `tenantId` em nenhuma tabela.
- **Cenário APPLIED é imutável** — `Cenario.snapshot` (JSON) congelado no apply. **Nunca mutar**.
- **State machine de cenário** — `DRAFT → APPLIED → ARCHIVED`. Apenas 1 APPLIED por `(modeloRegra, ano)`.
- **Optimistic locking** — `Cenario.versao` incrementa em cada update; cliente envia versão esperada.
- **Premissas como dado** — `Premissa` é template reutilizável (pesos PE, % Blocos, pool, faixas). Adicionar/mudar premissa **não requer código**.
- **Override por cenário** — `Cenario.parametrosOverride: Json?` permite ajustar parâmetros (Blocos, Pool, Chave, etc) **dentro da simulação** sem afetar a `Premissa` compartilhada nem outros cenários. `Cenario.parametrosDirty: Boolean` marca quando o override foi alterado mas o cenário ainda não foi recalculado (UI mostra ponto vermelho + destaca botão Recalcular). `calcularCenario` lê `override ?? premissa.parametros`. Botão "Salvar como nova premissa" promove o override no catálogo.
- **Histórico por cenário** — `ClassificacaoSocio` permite reenquadrar sócio em cada cenário sem perder histórico.
- **Calculados são derivados, não fonte de verdade** — `RemuneracaoCalculada` pode ser recomputada a partir de Cenário + Premissa + Resultados; é cache materializado.

---

## 5. Padrões de código

- **TypeScript strict**, sem `any`. Use `unknown` + narrowing.
- **Validação em borda**: route handlers usam Zod (`lib/schemas/`). `domain/` confia no input.
- **Tipos derivados**: `type Foo = z.infer<typeof FooSchema>`.
- **Erros**: `AuthError` em `lib/auth/guards.ts` — siga o padrão. Nunca vaze stack para o cliente.
- **Logs**: estruturados, sem PII/dados financeiros. Use `safeMeta()` de `lib/audit/`.
- **Naming**:
  - Domínio DSF: PT-BR (`Socio`, `Cenario`, `Premissa`, `BlocoA`, `Pool`).
  - Infra/lib: EN (`PrismaClient`, `JwtToken`, `signIn`).
- **Comentários**: só quando o "porquê" não é óbvio. Decisões da Política DSF devem citar a seção do documento.
- **`findMany` sem `take`**: proibido por lint. Volume típico (≤ 30 sócios) é pequeno mas a regra existe.

---

## 6. Auth & permissões

- **Auth.js v5** — apenas e-mail/senha (bcrypt). Google OAuth foi **removido** por decisão do cliente (acesso interno restrito; admin gerencia usuários da DSF um a um).
- **Allowlist** — login só passa se `Usuario.ativo=true`. Sem auto-cadastro.
- **Roles** (multi, array):
  - `ADMIN` — configuração, usuários, aplicar/arquivar cenários
  - `CONSULTOR` — perfil WRE: cria/edita cenários e premissas, vê tudo
  - `SOCIO` — perfil DSF: vê cenários APPLIED + sua própria simulação (via `Usuario.socioId`)
  - `LEITOR` — somente leitura
- **`senhaProvisoria`** — flag setada quando admin reseta senha. Middleware (`proxy.ts`) força `/perfil/senha`.
- **Confidencialidade**: a Política de Partnership DSF (cláusula 17.4) impõe sigilo de 5 anos pós-término. Dados de remuneração individual são **altamente sensíveis**.
- **Auditoria**:
  - `LoginEvent` — toda tentativa (sucesso/falha + motivo + IP + userAgent)
  - `AuditLog` — toda mutação (cenário aplicado, premissa salva, classificação editada) com `safeMeta` redaction
  - `safeMeta` redige: credenciais (`senha`, `password`, `token`, `secret`, `hash`), PII (`cpf`, `cnpj`, `rg`) e **toda chave de remuneração** (`salario`, `prolabore`, `bloco[abc]`, `pool*`, `premio`, `ajustes`, `total`, `creditoOriginacao`, `creditoExecucao`, `creditoGestaoCP`, `percentualQuotas`, `fundingVariavel`). Ver `lib/audit/index.ts`.

### Padrões obrigatórios em código

**1. APIs REST devem usar `withAuth` + escopo:**
```ts
// app/api/.../route.ts
import { withAuth } from "@/lib/api/handler";
import { escopoDe } from "@/lib/auth/escopo";

export async function GET(req: Request) {
  return withAuth(async (session) => {
    const escopo = escopoDe(session);
    // SOCIO restrito → filtra para o próprio sócio
    const where = escopo.ehSocioRestrito
      ? { ...baseWhere, socioId: escopo.socioIdEscopo ?? "__nada__" }
      : baseWhere;
    // ...
  }, { roles: ["ADMIN", "CONSULTOR"] }); // opcional — bloqueia roles não-listadas
}
```

**2. Server Actions devem usar `escopoDe` + early return:**
```ts
async function minhaAction(formData: FormData) {
  "use server";
  const session = await auth();
  const escopo = escopoDe(session?.user as SessionUser | undefined);
  if (!escopo.podeMutar) return; // ou redirect
  // ...
}
```

**3. SOCIO restrito NUNCA pode ver:**
- Cenários `DRAFT` ou `ARCHIVED`
- Pacote de outros sócios (em qualquer rota: detalhe, comparar, exportar, apresentar)
- Premissas (são parâmetros internos do modelo)
- Lista de usuários

**4. Cenários `APPLIED` são imutáveis** — `calcularCenario` rejeita com 409 se status ≠ DRAFT. Para "editar" um cenário publicado, criar novo a partir dele.

**5. Optimistic locking** — PUT `/api/cenarios/[id]/classificacoes` aceita `versionExpected`. Se diferir do `Cenario.versao` atual, retorna 409 (`Conflito de edição`). Use sempre que houver chance de edição concorrente.

**6. Rate limit em login** — `lib/auth/events.ts:loginEstaBloqueado` bloqueia email com ≥10 falhas em 5min. Funciona em serverless (lê `LoginEvent`).

---

## 7. Engine de cálculo — extensibilidade

### Modelo ATUAL (`lib/domain/dsf/modelo-atual.ts`)
Replica fielmente a planilha 1T2026. Mudanças requerem aprovação explícita do usuário (mexer aqui = mudar a baseline de comparação).

### Modelo NOVO (`lib/domain/dsf/modelo-novo.ts`)
Implementa as 9 etapas do Mapa Econômico. **Aberto para extensão via `Premissa`**, fechado para modificação. Para adicionar uma regra nova:

1. Acrescente o parâmetro em `PremissasModeloNovo` (`tipos.ts`).
2. Acrescente o cálculo no engine respeitando a ordem de apuração.
3. Acrescente validação na sobreposição se gera novo mecanismo.
4. Adicione teste unit cobrindo o novo caso.

**Etapas ainda não implementadas no MVP**: alocação interunidades por projeto (etapa 5). Requer cadastro de Cliente/Projeto + chave de alocação por workstream — fora do escopo inicial.

---

## 8. Testes — pirâmide & cenários obrigatórios

### Pirâmide
- **Unit (maioria)**: `lib/domain/**` — 100% cobertura. Sem Prisma, sem Next.
- **Integration**: route handlers + Prisma contra DB `_test` em `:5434`.
- **E2E**: Playwright nos caminhos críticos (login, criar cenário, aplicar, comparar).

### Guardrail
`tests/helpers/db.ts` aborta se `DATABASE_URL` não contém `"_test"`.

### Cenários de teste obrigatórios

**Modelo Atual (unit)** — `tests/unit/paridade-1t2026.test.ts` valida paridade contra a planilha:
- ✅ Pró-labore = R$ 5.000 × meses (14 sócios × 5k × 3 = R$ 210.000 trim)
- ✅ Rem.Gestão trim = R$ 252.000 (planilha: R$ 84.000 mensal × 3)
- ✅ Fundadores: cada um recebe `quota × funding_BG` (sem normalização). Total ≈ R$ 262.204,88
- ✅ Funding DSF = LL_DSF − Σrem.fundadores ≈ R$ 1.132.507,28
- ✅ Distribuição não-fund (95%) ≈ R$ 1.075.881,92
- ✅ Reserva (5%) = R$ 56.625,36 — distribuída como prêmio uniforme para 12 sócios elegíveis (R$ 4.718,78 cada)
- ✅ Total geral planilha (gestão + fundadores + distribuição, sem prêmio) ≈ R$ 1.590.086,80
- ✅ Alessandro (CEO, 13.184%): pacote trim = 15k + 28.8k + 201.890,56 + 4.718,78 = R$ 250.409,34

**Modelo Novo (unit)**:
- Bloco A só para Sócios de Capital, rateio por quotas.
- Bloco B distribuído entre Capital + Serviços (uniforme no MVP, com pesos no futuro).
- Pool 30% Líder × LL_unidade vai para o líder formal da unidade.
- Remuneração de Administração é deduzida do RDA (etapa 3 antes da etapa 8).
- Soma A+B+C ≠ 100% gera alerta global.
- Soma Pool 50+30+20 ≠ 100% gera alerta global.

**Não-sobreposição (unit)**:
- ✅ ERROR para Bloco A em Sócio de Serviços
- ✅ ERROR para Pool em Sócio de Capital sem liderança
- ✅ WARNING para Bloco B + Pool no mesmo pacote
- ✅ WARNING para Remuneração de Gestão sem função formal
- ✅ INFO para Bloco C aplicado

**Cenário (integration)**:
- DRAFT pode ser editado; `versao` incrementa.
- APPLIED rejeita updates (409).
- Apenas 1 APPLIED por `(modeloRegra, ano)`.
- ARCHIVED não pode ser reativado.

**Auth (integration + e2e)**:
- Email não na allowlist → falha + LoginEvent.
- `senhaProvisoria=true` → redirect `/perfil/senha`.
- Role `SOCIO` só vê o próprio pacote.

---

## 9. CI/CD

- **Husky pre-commit** (`.husky/pre-commit`): `lint` + `typecheck`.
- **Pipeline** (a definir): `lint → typecheck → test:unit → test:int → test:e2e → build`.
- **Docker**: build standalone (`output: "standalone"` em `next.config.ts`).

---

## 10. Anti-padrões proibidos

Lições do estudo do plr-simulator (NG Billing) + da Política DSF:

- ❌ **Importar DRE hierárquica** (3 níveis). Insumo é só LL por unidade × período.
- ❌ **Múltiplas "fontes de verdade" de cenário** (no PLR existem `cascade + snapshot + snapshotPreAplicacao`). Aqui: state machine única + 1 snapshot.
- ❌ **Mutar snapshot APPLIED**.
- ❌ **Hardcodar percentuais** (45/35/20, 50/30/20, 30/60/10). Tudo via `Premissa`.
- ❌ **Distribuir Bloco A para Non-Equity** — bloqueado por validador.
- ❌ **Pool de unidade sem líder formal** — bloqueado por validador.
- ❌ **`findMany` sem `take`** — bloqueado por lint.
- ❌ **Logs com PII / valores de remuneração** — redação automática via `safeMeta`.
- ❌ **Commits sem migration quando schema muda**.
- ❌ **Reintroduzir `tenantId`** — projeto é single-tenant. Se um dia a WRE quiser oferecer para outras firmas, isso será uma decisão arquitetural deliberada.

---

## 11. Como adicionar uma feature (checklist)

1. **Schema** — atualizar `prisma/schema.prisma` se houver dados novos.
2. **Migration** — `npm run db:migrate -- --name <nome>`. Reviewar SQL gerado.
3. **Domain logic** — implementar em `lib/domain/dsf/` (puro). Cobertura unit 100%.
4. **Schema Zod** — definir input/output em `lib/schemas/<feature>.ts`.
5. **Route handler** — em `app/api/<feature>/`, usando `requireSession`/`requireRole`, validando com Zod, registrando `logAudit`.
6. **Integration test** — em `tests/integration/<feature>.test.ts` (com `resetDb` + seed).
7. **UI** — página/components conforme necessário.
8. **E2E** — só para fluxos críticos.
9. **Atualizar AGENTS.md** se a decisão arquitetural muda.

---

## 12. Glossário

- **DSF** — Dupont Spiller & Fadanelli Advogados Associados. Cliente final.
- **WRE** — WRE Consultoria. Empresa que desenvolve o simulador para a DSF.
- **Política 1 / Política de Partnership** — instrumento estruturante (Equity, governança, blocos econômicos). Já redigida.
- **Política 2 / Política de Remuneração** — instrumento operacional (pesos, tabelas, critérios). Será escrita; o simulador deve **prever sua parametrização**.
- **RDA** — Resultado Distribuível Ajustado. LL após deduções, custos, provisões, reservas e remuneração de administração.
- **Bloco A / B / C** — três parcelas do RDA: Institucional (capital), Performance, Estratégico/LP.
- **Pool de Unidade** — distribuição do Resultado Líquido da Unidade local: 50% Sociedade / 30% Líder / 20% equipe.
- **Crédito de Originação / Execução / Gestão** — alocação interunidades quando uma unidade origina cliente que outra executa. Chave 30/60/10.
- **Equity / Non-Equity** — sócio com / sem participação no capital social.
- **Buy-in** — entrada no Equity via funding híbrido (crédito interno + retenção + co-investimento).
- **Vesting** — consolidação gradual da participação (recomendado 4 anos).
- **Pró-labore** — retirada fixa mensal (R$ 5.000 no atual).
- **Remuneração de Administração** — função formal de gestão (CEO, Diretores Exec., Gestores). Tabela A/B/C/D × Inicial/Pleno/Expert.
- **Modelo ATUAL** — sistema do 1º trim 2026 (planilha). Baseline de comparação.
- **Modelo NOVO** — Política DSF v1. Estado-alvo da simulação.
- **Premissa** — template salvo de parâmetros (pesos, %, faixas) reutilizável entre cenários.
- **Cenário** — uma simulação completa (modelo + premissa + classificações + resultados financeiros).

---

## 13. Onde começar (próxima iteração)

Após este scaffold:

1. **Migration inicial** + seed: 14 sócios + tabela salarial + Unidade DSF/BG + ResultadoPeriodo 1T2026 + 2 Premissas (ATUAL e NOVO) + Usuario admin.
2. **Validar paridade do Modelo ATUAL** contra a planilha (R$ 1.590.087 distribuído no 1T2026).
3. **API REST** mínima: `POST /api/cenarios` (criar), `POST /api/cenarios/:id/calcular`, `POST /api/cenarios/:id/aplicar`, `GET /api/cenarios/:id/comparar?contra=:outroId`.
4. **UI MVP**:
   - Lista de sócios (drag entre públicos)
   - Sliders para % Blocos A/B/C, pool 50/30/20, chaves 30/60/10
   - Tabela de pacote anual por sócio
   - Comparativo lado a lado (ATUAL × NOVO)
   - Painel de alertas de não-sobreposição
5. **Exportar relatório** PDF/XLSX do cenário aplicado para apresentação aos sócios.

Cada iteração segue o checklist da seção 11.
