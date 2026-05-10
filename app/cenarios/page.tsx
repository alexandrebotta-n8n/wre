import { permanentRedirect } from "next/navigation";

// /cenarios → /simulacao (rotas unificadas).
export default function CenariosPage() {
  permanentRedirect("/simulacao");
}
