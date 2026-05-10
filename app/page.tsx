import { redirect } from "next/navigation";

// Home redireciona para a página única de simulação.
export default function HomePage() {
  redirect("/simulacao");
}
