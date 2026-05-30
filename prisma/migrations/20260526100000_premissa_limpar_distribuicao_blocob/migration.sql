-- Remove campos descontinuados de Premissa.parametros (JSONB) no modelo NOVO.
--
-- Motivação: o Bloco B passou a usar regra única (Política DSF v1):
--   ValorBlocoB(sócio) = blocoBNumSalariosAlvo × (proLaboreMensal + remGestaoMensal)
-- Antes existiam 5 modos configuráveis na premissa (`distribuicaoBlocoB`)
-- + matriz de pesos por área (`pesosPorArea`) + `pesoCategoria` (modulador
-- por público) + `proRataMinMeses` (nunca lido pelo engine).
-- Todos foram removidos do schema Zod / engine — limpar do JSON evita ruído
-- futuro e mantém o `.strict()` do schema funcionando ao re-editar premissas.
--
-- Cenários APPLIED têm snapshot próprio (Cenario.snapshot) e NÃO são
-- afetados — o trigger `trg_prevent_cenario_applied_mutation` (migration
-- 20260510120000_cenario_applied_immutable) bloqueia qualquer alteração.

UPDATE "Premissa"
SET parametros = parametros
  - 'distribuicaoBlocoB'
  - 'pesosPorArea'
  - 'proRataMinMeses'
  - 'pesoCategoria'
WHERE modelo = 'NOVO';
