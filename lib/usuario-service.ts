// Service de Usuario — criação, reset de senha, gerenciamento de roles.
//
// Geração de senha provisória: 12 chars alfanuméricos legíveis (sem 0/O/l/1
// pra reduzir confusão na hora de comunicar verbalmente).
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import type { Usuario, UsuarioRole } from "@prisma/client";

const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

export function gerarSenhaProvisoria(len = 12): string {
  let s = "";
  for (let i = 0; i < len; i++) {
    s += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  }
  return s;
}

export interface CriarUsuarioArgs {
  email: string;
  nome?: string;
  roles: UsuarioRole[];
  socioId?: string | null;
  senhaTextoPlano?: string; // se omitido, gera provisória
}

export interface CriarUsuarioResult {
  usuario: Usuario;
  /** Senha em texto plano para o admin comunicar — disponível APENAS no momento da criação. */
  senhaProvisoriaPlano: string;
}

export async function criarUsuarioComSenha(args: CriarUsuarioArgs): Promise<CriarUsuarioResult> {
  const senhaPlano = args.senhaTextoPlano ?? gerarSenhaProvisoria();
  const senhaHash = await bcrypt.hash(senhaPlano, 10);
  const u = await prisma.usuario.create({
    data: {
      email: args.email,
      nome: args.nome,
      roles: args.roles,
      socioId: args.socioId,
      senhaHash,
      senhaProvisoria: true, // sempre — força troca no 1º login
      ativo: true,
    },
  });
  return { usuario: u, senhaProvisoriaPlano: senhaPlano };
}

export async function resetarSenha(usuarioId: string): Promise<string> {
  const senhaPlano = gerarSenhaProvisoria();
  const senhaHash = await bcrypt.hash(senhaPlano, 10);
  await prisma.usuario.update({
    where: { id: usuarioId },
    data: { senhaHash, senhaProvisoria: true },
  });
  return senhaPlano;
}
