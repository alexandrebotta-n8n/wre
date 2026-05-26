-- Socio.blocoCValorManualAno: valor anual em R$ do Bloco C por sócio.
-- null = não recebe (default). Hoje todos partem zerados; usuário ajusta
-- caso-a-caso em /socios quando há deliberação estratégica formal.
--
-- Cenario.totalReservaCentral: cache do `resultado.totalReservaCentral`
-- do último cálculo (apenas cenários NOVO). Permite a UI mostrar a
-- "Reserva 20% (NOVO)" abaixo do "Diff total (B−A)" sem recalcular.
ALTER TABLE "Socio" ADD COLUMN "blocoCValorManualAno" DOUBLE PRECISION;
ALTER TABLE "Cenario" ADD COLUMN "totalReservaCentral" DOUBLE PRECISION;
