// Preferências de exibição armazenadas em cookie.
//
// Hoje suportamos:
//   - modoNome: "completo" | "iniciais" (anonimização para apresentações
//     em reuniões com terceiros, screenshots, exportações compartilhadas).
//
// Default = "iniciais" (mais conservador para um simulador de remuneração
// de sócios — confidencialidade é alta por contrato; cláusula 17.4 da
// Política de Partnership DSF impõe sigilo de 5 anos).
import { cookies } from "next/headers";
import { cookieOptions } from "@/lib/cookies";

export type ModoNome = "completo" | "iniciais";

const COOKIE = "wre.modoNome";

export async function getModoNome(): Promise<ModoNome> {
  const c = await cookies();
  const v = c.get(COOKIE)?.value;
  return v === "completo" ? "completo" : "iniciais";
}

export async function setModoNome(modo: ModoNome): Promise<void> {
  const c = await cookies();
  // httpOnly:false porque a UI pode precisar ler para toggle client-side.
  // É só preferência de exibição (modo iniciais vs. completo) — não sensível.
  c.set(COOKIE, modo, cookieOptions({ httpOnly: false, maxAge: 60 * 60 * 24 * 365 }));
}

// ============================================================================
// Tour de boas-vindas da Simulação — mostrado na 1ª visita
// ============================================================================

const COOKIE_TOUR = "wre.simulacao.tour-visto";

export async function getTourVisto(): Promise<boolean> {
  const c = await cookies();
  return c.get(COOKIE_TOUR)?.value === "1";
}

export async function marcarTourVisto(): Promise<void> {
  const c = await cookies();
  c.set(COOKIE_TOUR, "1", cookieOptions({ httpOnly: false, maxAge: 60 * 60 * 24 * 365 }));
}
