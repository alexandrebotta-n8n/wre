-- AlterTable
ALTER TABLE "Socio" ADD COLUMN     "areaPraticaId" TEXT;

-- CreateTable
CREATE TABLE "AreaPratica" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AreaPratica_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AreaPratica_codigo_key" ON "AreaPratica"("codigo");

-- CreateIndex
CREATE INDEX "Socio_areaPraticaId_idx" ON "Socio"("areaPraticaId");

-- AddForeignKey
ALTER TABLE "Socio" ADD CONSTRAINT "Socio_areaPraticaId_fkey" FOREIGN KEY ("areaPraticaId") REFERENCES "AreaPratica"("id") ON DELETE SET NULL ON UPDATE CASCADE;
