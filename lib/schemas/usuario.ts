// Schemas Zod para CRUD de Usuario.
import { z } from "zod";

const ROLES = ["ADMIN", "CONSULTOR", "SOCIO", "LEITOR"] as const;
export const RoleEnum = z.enum(ROLES);

// .strict() rejeita campos extras no body (defesa contra mass assignment:
// e.g., cliente tenta enviar { senhaHash, ativo, ... } para sobrescrever
// campos protegidos). Email NÃO é permitido em update — mudança de email
// requer fluxo dedicado com verificação OTP (futuro).
export const CriarUsuarioSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  nome: z.string().max(120).optional(),
  roles: z.array(RoleEnum).min(1),
  socioId: z.string().nullable().optional(),
  // Quando omitido, gera senha provisória aleatória.
  senha: z.string().min(8).max(120).optional(),
}).strict();
export type CriarUsuarioInput = z.infer<typeof CriarUsuarioSchema>;

export const AtualizarUsuarioSchema = z.object({
  nome: z.string().max(120).optional(),
  roles: z.array(RoleEnum).min(1).optional(),
  socioId: z.string().nullable().optional(),
  ativo: z.boolean().optional(),
}).strict();
export type AtualizarUsuarioInput = z.infer<typeof AtualizarUsuarioSchema>;
