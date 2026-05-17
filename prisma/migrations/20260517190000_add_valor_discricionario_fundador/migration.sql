-- Adiciona campo valorDiscricionario em ClassificacaoSocio.
-- Usado no modelo NOVO para pagamento discricionário a fundadores,
-- abatido do LL antes do RDA. Null = 0 (sem discricionário).
ALTER TABLE "ClassificacaoSocio" ADD COLUMN "valorDiscricionario" DOUBLE PRECISION;
