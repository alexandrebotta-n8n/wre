-- Adiciona overrides individuais de remuneração no Socio.
-- Quando preenchidos, sobrescrevem Premissa.proLaboreMensal e o lookup
-- de TabelaSalario para esse sócio específico. Null = usa default.
ALTER TABLE "Socio" ADD COLUMN "proLaboreMensal" DOUBLE PRECISION;
ALTER TABLE "Socio" ADD COLUMN "remuneracaoGestaoMensal" DOUBLE PRECISION;
