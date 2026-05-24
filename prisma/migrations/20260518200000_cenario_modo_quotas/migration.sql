-- Adiciona enum ModoQuotas + campo Cenario.modoQuotas.
--
-- Usado pra simular "e se fundadores/Sócios de Serviços não tivessem quota
-- de capital?" — redistribui proporcionalmente entre Sócios de Capital
-- remanescentes. Helper puro: lib/domain/dsf/quotas.ts.
--
-- Comportamento default ORIGINAL preserva cenários existentes (incluindo
-- APPLIED, que ignora flag por já ter snapshot congelado).

CREATE TYPE "ModoQuotas" AS ENUM ('ORIGINAL', 'REDISTRIBUIDA');

ALTER TABLE "Cenario"
  ADD COLUMN "modoQuotas" "ModoQuotas" NOT NULL DEFAULT 'ORIGINAL';
