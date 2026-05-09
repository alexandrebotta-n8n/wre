-- AlterTable
ALTER TABLE "Premissa" ADD COLUMN     "versao" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "PremissaHistorico" (
    "id" TEXT NOT NULL,
    "premissaId" TEXT NOT NULL,
    "versao" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "parametros" JSONB NOT NULL,
    "snapshotEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snapshotPorId" TEXT,
    "motivo" TEXT,

    CONSTRAINT "PremissaHistorico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PremissaHistorico_premissaId_snapshotEm_idx" ON "PremissaHistorico"("premissaId", "snapshotEm");

-- CreateIndex
CREATE UNIQUE INDEX "PremissaHistorico_premissaId_versao_key" ON "PremissaHistorico"("premissaId", "versao");

-- AddForeignKey
ALTER TABLE "PremissaHistorico" ADD CONSTRAINT "PremissaHistorico_premissaId_fkey" FOREIGN KEY ("premissaId") REFERENCES "Premissa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PremissaHistorico" ADD CONSTRAINT "PremissaHistorico_snapshotPorId_fkey" FOREIGN KEY ("snapshotPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
