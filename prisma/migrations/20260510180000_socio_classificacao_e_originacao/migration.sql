-- Adicionar Socio.publicoDefault (NOT NULL com default SOCIO_SERVICOS),
-- Socio.unidadeLideradaId (FK para Unidade), Cenario.originacaoOverride (Json?)
-- e nova tabela OriginacaoPeriodo (socio × período × valor).
--
-- Estratégia para publicoDefault em registros existentes:
--   1. Adiciona com default SOCIO_SERVICOS (NOT NULL imediato — sem etapa de backfill).
--   2. Atualiza fundadores → SOCIO_CAPITAL (mais próximo do papel atual).
--   3. Demais ficam SOCIO_SERVICOS como rascunho — usuário ajusta na UI /socios.

-- AlterTable Socio
ALTER TABLE "Socio" ADD COLUMN "publicoDefault" "Publico" NOT NULL DEFAULT 'SOCIO_SERVICOS';
ALTER TABLE "Socio" ADD COLUMN "unidadeLideradaId" TEXT;

-- Backfill: fundadores começam como SOCIO_CAPITAL
UPDATE "Socio" SET "publicoDefault" = 'SOCIO_CAPITAL' WHERE "isFundador" = true;

-- Backfill: cargos com "Líder de Unidade" no nome viram LIDER_UNIDADE_NON_EQUITY
UPDATE "Socio" SET "publicoDefault" = 'LIDER_UNIDADE_NON_EQUITY'
  WHERE "isFundador" = false AND "cargo" ~* 'L[íi]der de Unidade';

-- AlterTable Cenario
ALTER TABLE "Cenario" ADD COLUMN "originacaoOverride" JSONB;

-- CreateTable OriginacaoPeriodo
CREATE TABLE "OriginacaoPeriodo" (
    "id" TEXT NOT NULL,
    "socioId" TEXT NOT NULL,
    "periodoId" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "ehReal" BOOLEAN NOT NULL DEFAULT true,
    "fonte" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OriginacaoPeriodo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OriginacaoPeriodo_socioId_periodoId_key" ON "OriginacaoPeriodo"("socioId", "periodoId");
CREATE INDEX "OriginacaoPeriodo_periodoId_idx" ON "OriginacaoPeriodo"("periodoId");

-- CreateIndex Socio
CREATE INDEX "Socio_unidadeLideradaId_idx" ON "Socio"("unidadeLideradaId");

-- AddForeignKey
ALTER TABLE "Socio" ADD CONSTRAINT "Socio_unidadeLideradaId_fkey" FOREIGN KEY ("unidadeLideradaId") REFERENCES "Unidade"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OriginacaoPeriodo" ADD CONSTRAINT "OriginacaoPeriodo_socioId_fkey" FOREIGN KEY ("socioId") REFERENCES "Socio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OriginacaoPeriodo" ADD CONSTRAINT "OriginacaoPeriodo_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "Periodo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
