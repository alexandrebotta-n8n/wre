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

export type ModoNome = "completo" | "iniciais";

const COOKIE = "wre.modoNome";

export async function getModoNome(): Promise<ModoNome> {
  const c = await cookies();
  const v = c.get(COOKIE)?.value;
  return v === "completo" ? "completo" : "iniciais";
}

export async function setModoNome(modo: ModoNome): Promise<void> {
  const c = await cookies();
  c.set(COOKIE, modo, {
    httpOnly: false, // precisa ser legível pelo client se algum dia exibirmos toggle JS
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 ano
  });
}
