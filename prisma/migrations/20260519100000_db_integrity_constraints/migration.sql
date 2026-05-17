-- Defesas de integridade em nível de DB. Complementam Zod no app: garantem que
-- mutações via psql/scripts/admin direto também respeitem invariantes.
--
-- Estratégia: usar NOT VALID para adicionar constraints SEM rescanear linhas
-- existentes (rápido e seguro mesmo em prod com dados legados). Linhas futuras
-- (INSERT/UPDATE) passam pelo check; legadas só seriam validadas se rodarmos
-- VALIDATE CONSTRAINT depois (deferido — usamos só se quiser garantir 100%).
--
-- Idempotência: cada ADD CONSTRAINT é envolvido em DO block que ignora 42710
-- (duplicate object). Útil pra re-aplicar migration sem quebrar.

-- ============================================================================
-- Socio: faixas plausíveis (% quotas em [0,1], valores monetários >= 0)
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE "Socio"
    ADD CONSTRAINT "Socio_percentualQuotasDefault_range_check"
    CHECK ("percentualQuotasDefault" >= 0 AND "percentualQuotasDefault" <= 1)
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Socio"
    ADD CONSTRAINT "Socio_proLaboreMensal_nonneg_check"
    CHECK ("proLaboreMensal" IS NULL OR "proLaboreMensal" >= 0)
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Socio"
    ADD CONSTRAINT "Socio_remuneracaoGestaoMensal_nonneg_check"
    CHECK ("remuneracaoGestaoMensal" IS NULL OR "remuneracaoGestaoMensal" >= 0)
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Socio"
    ADD CONSTRAINT "Socio_originacaoAnualPadrao_nonneg_check"
    CHECK ("originacaoAnualPadrao" IS NULL OR "originacaoAnualPadrao" >= 0)
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Socio"
    ADD CONSTRAINT "Socio_fundingFundadorAnual_nonneg_check"
    CHECK ("fundingFundadorAnual" IS NULL OR "fundingFundadorAnual" >= 0)
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- ClassificacaoSocio: quotas em [0,1], originação e peso >= 0
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE "ClassificacaoSocio"
    ADD CONSTRAINT "ClassificacaoSocio_percentualQuotas_range_check"
    CHECK ("percentualQuotas" >= 0 AND "percentualQuotas" <= 1)
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ClassificacaoSocio"
    ADD CONSTRAINT "ClassificacaoSocio_originacaoEsperada_nonneg_check"
    CHECK ("originacaoEsperada" >= 0)
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ClassificacaoSocio"
    ADD CONSTRAINT "ClassificacaoSocio_pesoBlocoB_nonneg_check"
    CHECK ("pesoBlocoB" IS NULL OR "pesoBlocoB" >= 0)
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- Periodo: trimestre coerente com o tipo
--   tipo='TRIMESTRE' → trimestre ∈ [1,4]
--   tipo='ANO'       → trimestre IS NULL
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE "Periodo"
    ADD CONSTRAINT "Periodo_trimestre_coerente_check"
    CHECK (
      (tipo = 'TRIMESTRE' AND trimestre BETWEEN 1 AND 4)
      OR (tipo = 'ANO' AND trimestre IS NULL)
    )
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Periodo"
    ADD CONSTRAINT "Periodo_ano_plausivel_check"
    CHECK (ano BETWEEN 2000 AND 2100)
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- ResultadoPeriodo: fundingVariavel >= 0 (LL pode ser negativo se prejuízo).
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE "ResultadoPeriodo"
    ADD CONSTRAINT "ResultadoPeriodo_fundingVariavel_nonneg_check"
    CHECK ("fundingVariavel" IS NULL OR "fundingVariavel" >= 0)
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- TabelaSalario: salário positivo
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE "TabelaSalario"
    ADD CONSTRAINT "TabelaSalario_valor_positivo_check"
    CHECK ("valor" > 0)
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- Índices que faltavam:
--   - ResultadoPeriodo(unidadeId) — PainelGlobais filtra por unidade
--   - AuditLog(usuarioId, acao, ocorridoEm) — usado pelo rate-limit genérico
-- ============================================================================

CREATE INDEX IF NOT EXISTS "ResultadoPeriodo_unidadeId_idx"
  ON "ResultadoPeriodo"("unidadeId");

CREATE INDEX IF NOT EXISTS "AuditLog_usuario_acao_ocorrido_idx"
  ON "AuditLog"("usuarioId", "acao", "ocorridoEm");
