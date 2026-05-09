import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";

const COOKIE = "wre.senhaGerada";

// Endpoint one-shot que entrega (e remove) a senha provisória gerada
// pela última criação/reset de usuário. Apenas ADMINs podem ler.
export async function GET() {
  const session = await auth();
  if (!session?.user?.roles?.includes("ADMIN")) {
    return NextResponse.json(null);
  }
  const c = await cookies();
  const raw = c.get(COOKIE)?.value;
  if (!raw) return NextResponse.json(null);
  c.delete(COOKIE);
  try {
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json(null);
  }
}
