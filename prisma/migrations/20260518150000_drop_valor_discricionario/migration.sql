-- Remove ClassificacaoSocio.valorDiscricionario (feature substituída).
-- A remuneração dos fundadores agora vive em Socio.fundingFundadorAnual
-- (cadastro permanente em /socios), não mais per-cenário.
ALTER TABLE "ClassificacaoSocio" DROP COLUMN IF EXISTS "valorDiscricionario";
