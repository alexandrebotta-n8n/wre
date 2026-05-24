-- Modo de quotas vira config GLOBAL por ano (vivia em Cenario antes; agora
-- vive em ConfiguracaoAno). Cada ano tem 1 modo aplicado a todos cenários
-- DRAFT daquele ano.
--
-- Cenario.modoQuotas (migration 20260518200000) FICA — é sincronizado com o
-- global quando user troca o modo OU quando o cenário é recalculado.
-- APPLIED preserva o modo do momento da publicação (snapshot imutável).
--
-- Default ORIGINAL preserva comportamento — cenários existentes calculam igual
-- ao que faziam antes.

ALTER TABLE "ConfiguracaoAno"
  ADD COLUMN "modoQuotas" "ModoQuotas" NOT NULL DEFAULT 'ORIGINAL';
