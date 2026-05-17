-- Centralização de variáveis globais em /simulacao + anualização do sistema.
--
-- 1. Cria tabela ConfiguracaoAno (funding fundadores arbitrário).
-- 2. Para cada ano com ResultadoPeriodo TRIMESTRE, cria período ANO (se faltar)
--    e agrega os 4 trimestres em uma linha ResultadoPeriodo por unidade/ano.
-- 3. Idem para OriginacaoPeriodo (agrega trimestres → ano por sócio).
-- 4. Cria ConfiguracaoAno para cada ano com Periodo existente (default 0).
-- 5. Limpa resultadosOverride e originacaoOverride de DRAFTs.
-- 6. Deleta RemuneracaoCalculada de DRAFTs (serão recalculadas em base anual).
--
-- IMPORTANTE: dados TRIMESTRE antigos (Periodo, ResultadoPeriodo,
-- OriginacaoPeriodo, RemuneracaoCalculada de APPLIED) NÃO são deletados —
-- ficam como histórico para preservar APPLIED snapshots imutáveis.

-- CreateTable
CREATE TABLE "ConfiguracaoAno" (
    "ano" INTEGER NOT NULL,
    "fundingFundadoresAno" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "atualizadoPorId" TEXT,

    CONSTRAINT "ConfiguracaoAno_pkey" PRIMARY KEY ("ano")
);

-- =====================================================================
-- Para cada ano existente, garantir Periodo ANO + agregar trimestres
-- =====================================================================
DO $$
DECLARE
  ano_rec RECORD;
  periodo_ano_id TEXT;
BEGIN
  FOR ano_rec IN (SELECT DISTINCT ano FROM "Periodo") LOOP
    -- 1. Cria Periodo ANO se não existir
    SELECT id INTO periodo_ano_id FROM "Periodo"
      WHERE tipo = 'ANO' AND ano = ano_rec.ano LIMIT 1;
    IF periodo_ano_id IS NULL THEN
      periodo_ano_id := 'c' || md5(random()::text || ano_rec.ano::text);
      INSERT INTO "Periodo" (id, tipo, ano, trimestre, rotulo)
        VALUES (periodo_ano_id, 'ANO', ano_rec.ano, NULL, ano_rec.ano::text);
    END IF;

    -- 2. Agrega ResultadoPeriodo trimestrais → 1 linha ANO por unidade
    --    (não sobrescreve se já houver linha ANO para essa unidade/ano)
    INSERT INTO "ResultadoPeriodo" (id, "unidadeId", "periodoId", "lucroLiquido", "fundingVariavel", "ehReal", fonte, "importadoEm")
      SELECT
        'c' || md5(random()::text || rp."unidadeId" || ano_rec.ano::text),
        rp."unidadeId",
        periodo_ano_id,
        SUM(rp."lucroLiquido"),
        NULLIF(SUM(COALESCE(rp."fundingVariavel", 0)), 0),
        bool_and(rp."ehReal"),
        'agregado de trimestres ' || ano_rec.ano,
        NOW()
      FROM "ResultadoPeriodo" rp
      JOIN "Periodo" p ON p.id = rp."periodoId"
      WHERE p.ano = ano_rec.ano AND p.tipo = 'TRIMESTRE'
      GROUP BY rp."unidadeId"
      ON CONFLICT ("unidadeId", "periodoId") DO NOTHING;

    -- 3. Agrega OriginacaoPeriodo trimestrais → 1 linha ANO por sócio
    INSERT INTO "OriginacaoPeriodo" (id, "socioId", "periodoId", valor, "ehReal", fonte, "criadoEm", "atualizadoEm")
      SELECT
        'c' || md5(random()::text || op."socioId" || ano_rec.ano::text),
        op."socioId",
        periodo_ano_id,
        SUM(op.valor),
        bool_and(op."ehReal"),
        'agregado de trimestres ' || ano_rec.ano,
        NOW(),
        NOW()
      FROM "OriginacaoPeriodo" op
      JOIN "Periodo" p ON p.id = op."periodoId"
      WHERE p.ano = ano_rec.ano AND p.tipo = 'TRIMESTRE'
      GROUP BY op."socioId"
      ON CONFLICT ("socioId", "periodoId") DO NOTHING;

    -- 4. Cria ConfiguracaoAno para esse ano se não existir
    INSERT INTO "ConfiguracaoAno" (ano, "fundingFundadoresAno", "atualizadoEm")
      VALUES (ano_rec.ano, 0, NOW())
      ON CONFLICT (ano) DO NOTHING;
  END LOOP;
END $$;

-- =====================================================================
-- Limpa overrides de cenários DRAFT (já não são mais usados pelo engine)
-- =====================================================================
UPDATE "Cenario"
SET "resultadosOverride" = NULL,
    "originacaoOverride" = NULL,
    "parametrosDirty" = true
WHERE status = 'DRAFT' AND ("resultadosOverride" IS NOT NULL OR "originacaoOverride" IS NOT NULL);

-- =====================================================================
-- Deleta RemuneracaoCalculada de DRAFTs (recalculadas em base anual depois)
-- =====================================================================
DELETE FROM "RemuneracaoCalculada"
WHERE "cenarioId" IN (SELECT id FROM "Cenario" WHERE status = 'DRAFT');
