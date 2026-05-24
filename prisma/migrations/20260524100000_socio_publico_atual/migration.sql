-- Socio.publicoAtual — classificação sob a política ATUAL (legado).
-- null = usa heurística por cargo + publicoDefault.
-- Permite modelar caso onde um sócio tem público diferente entre ATUAL e NOVO.
ALTER TABLE "Socio" ADD COLUMN "publicoAtual" "Publico";
