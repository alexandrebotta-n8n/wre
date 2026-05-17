-- Originação e Funding Fundador como campos do Sócio (não mais por ano em
-- ConfiguracaoAno ou OriginacaoPeriodo). Centraliza tudo em /socios.
ALTER TABLE "Socio" ADD COLUMN "originacaoAnualPadrao" DOUBLE PRECISION;
ALTER TABLE "Socio" ADD COLUMN "fundingFundadorAnual" DOUBLE PRECISION;

-- Backfill: agrega OriginacaoPeriodo ANO em Socio.originacaoAnualPadrao.
-- Para cada sócio, pega o valor do período ANO mais recente.
UPDATE "Socio" s
SET "originacaoAnualPadrao" = (
  SELECT op.valor
  FROM "OriginacaoPeriodo" op
  JOIN "Periodo" p ON p.id = op."periodoId"
  WHERE op."socioId" = s.id AND p.tipo = 'ANO'
  ORDER BY p.ano DESC
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1
  FROM "OriginacaoPeriodo" op2
  JOIN "Periodo" p2 ON p2.id = op2."periodoId"
  WHERE op2."socioId" = s.id AND p2.tipo = 'ANO'
);

-- Marca todos os DRAFTs como dirty (precisam recalcular com nova lógica).
UPDATE "Cenario" SET "parametrosDirty" = true WHERE status = 'DRAFT';
