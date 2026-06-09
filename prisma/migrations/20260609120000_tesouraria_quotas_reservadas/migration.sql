-- Remove o modo de quotas (redistribuição) — a política NOVA passa a usar
-- quotas originais e reservar fundadores + Sócios de Serviço em tesouraria.

-- AlterTable
ALTER TABLE "ConfiguracaoAno" DROP COLUMN "modoQuotas";

-- AlterTable
ALTER TABLE "Cenario" DROP COLUMN "modoQuotas",
ADD COLUMN     "tesourariaQuotasReservadas" DOUBLE PRECISION,
ADD COLUMN     "tesourariaValorBlocoA" DOUBLE PRECISION;

-- DropEnum
DROP TYPE "ModoQuotas";
