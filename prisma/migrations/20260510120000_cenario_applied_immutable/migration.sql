-- Imutabilidade de Cenário APPLIED no nível do banco (defesa em profundidade).
--
-- Regra de negócio (Política DSF cl. 17.4): cenários publicados (APPLIED)
-- congelam o snapshot e nunca podem ser alterados — eles são a base de
-- deliberações sobre remuneração de sócios e devem ser auditáveis para
-- sempre. Hoje a regra é validada apenas em TypeScript (lib/cenario-service);
-- esta migração move a garantia para o PostgreSQL, de forma que mesmo um
-- UPDATE direto via psql, ORM bug, ou comprometimento de credencial de app
-- não consiga adulterar o histórico.
--
-- Permitido em APPLIED:
--   - status: APPLIED → ARCHIVED (arquivamento)
-- Bloqueado em APPLIED (raise exception):
--   - qualquer mudança em snapshot, parametrosOverride, parametrosDirty,
--     premissaId, modelo, ano, descricao, nome, classificacoes (via FK)
--   - status APPLIED → DRAFT (re-edição) ou APPLIED → APPLIED (regrade)

CREATE OR REPLACE FUNCTION prevent_cenario_applied_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'APPLIED' THEN
    -- Única transição permitida: APPLIED → ARCHIVED.
    IF NEW.status = 'ARCHIVED' AND
       NEW.snapshot IS NOT DISTINCT FROM OLD.snapshot AND
       NEW."parametrosOverride" IS NOT DISTINCT FROM OLD."parametrosOverride" AND
       NEW."parametrosDirty" IS NOT DISTINCT FROM OLD."parametrosDirty" AND
       NEW."premissaId" = OLD."premissaId" AND
       NEW.modelo = OLD.modelo AND
       NEW.ano = OLD.ano AND
       NEW.nome = OLD.nome AND
       NEW.descricao IS NOT DISTINCT FROM OLD.descricao THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Cenario APPLIED é imutável (id=%); apenas APPLIED→ARCHIVED é permitido sem mudar campos congelados.', OLD.id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_cenario_applied_mutation ON "Cenario";
CREATE TRIGGER trg_prevent_cenario_applied_mutation
  BEFORE UPDATE ON "Cenario"
  FOR EACH ROW
  EXECUTE FUNCTION prevent_cenario_applied_mutation();

-- Bloqueia também DELETE de Cenario APPLIED (registro histórico).
CREATE OR REPLACE FUNCTION prevent_cenario_applied_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'APPLIED' THEN
    RAISE EXCEPTION 'Cenario APPLIED não pode ser deletado (id=%); use ARCHIVED.', OLD.id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_cenario_applied_delete ON "Cenario";
CREATE TRIGGER trg_prevent_cenario_applied_delete
  BEFORE DELETE ON "Cenario"
  FOR EACH ROW
  EXECUTE FUNCTION prevent_cenario_applied_delete();
