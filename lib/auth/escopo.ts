// Escopo de visualização derivado da sessão.
//
// Regras de negócio:
//   - ADMIN, CONSULTOR  → vêem tudo, podem mutar
//   - LEITOR            → vê tudo (read-only)
//   - SOCIO             → só vê cenários APPLIED + apenas seu próprio pacote
//                         (filtro automático via socioIdEscopo)
//
// Use os helpers exportados aqui em vez de espalhar `roles.includes(...)` pelo app.
import type { UsuarioRole } from "@prisma/client";
import type { SessionUser } from "@/lib/auth/guards";

export interface Escopo {
  /** true para ADMIN/CONSULTOR/LEITOR — sem restrição por sócio. */
  podeVerTudo: boolean;
  /** true para ADMIN/CONSULTOR — pode criar/calcular/aplicar/editar. */
  podeMutar: boolean;
  /** true se o perfil é apenas SOCIO (vê apenas o próprio pacote). */
  ehSocioRestrito: boolean;
  /** Quando ehSocioRestrito, o id do Socio cujo escopo deve ser aplicado. */
  socioIdEscopo: string | null;
}

const PAPEIS_AMPLOS: UsuarioRole[] = ["ADMIN", "CONSULTOR", "LEITOR"];
const PAPEIS_MUTATION: UsuarioRole[] = ["ADMIN", "CONSULTOR"];

export function escopoDe(user: SessionUser | undefined): Escopo {
  if (!user) {
    return { podeVerTudo: false, podeMutar: false, ehSocioRestrito: false, socioIdEscopo: null };
  }
  const podeVerTudo = user.roles.some((r) => PAPEIS_AMPLOS.includes(r));
  const podeMutar = user.roles.some((r) => PAPEIS_MUTATION.includes(r));
  const ehSocioRestrito = !podeVerTudo && user.roles.includes("SOCIO");
  return {
    podeVerTudo,
    podeMutar,
    ehSocioRestrito,
    socioIdEscopo: ehSocioRestrito ? user.socioId ?? null : null,
  };
}
