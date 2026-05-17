-- Remove ConfiguracaoAno.fundingFundadoresAno.
-- A remuneração dos fundadores agora é definida CASO A CASO em
-- ClassificacaoSocio.valorDiscricionario (BRL por sócio, por cenário).
ALTER TABLE "ConfiguracaoAno" DROP COLUMN "fundingFundadoresAno";
