import { NextResponse } from "next/server";
import { consumeFlash } from "@/lib/flash";

// API route que entrega (e consome) a mensagem flash atual.
// Chamada pelo <FlashConsumer /> client-side após cada navegação.
export async function GET() {
  const msg = await consumeFlash();
  return NextResponse.json(msg);
}
