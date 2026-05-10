-- AlterTable
ALTER TABLE "Cenario" ADD COLUMN     "parametrosDirty" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parametrosOverride" JSONB;
