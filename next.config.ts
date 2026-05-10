import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

function buildCSP(): string {
  // CSP estática (sem nonce). Mantemos `'unsafe-inline'` em script-src porque
  // o Next.js App Router emite scripts inline para hidratação (RSC payload,
  // <Script>) e remover sem migrar para nonce-CSP via middleware quebra a
  // app. Migração para nonce está rastreada como follow-up — requer mover
  // CSP para `proxy.ts` e validar hidratação em todas as rotas.
  // Mitigação atual: `frame-ancestors 'none'` + `object-src 'none'` +
  // `base-uri 'self'` + sanitização Zod em todos os inputs + ausência de
  // `dangerouslySetInnerHTML` no código (auditado).
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "https:"],
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      ...(isDev ? ["ws://localhost:*", "ws://127.0.0.1:*", "http://localhost:*"] : []),
    ],
    "frame-ancestors": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "object-src": ["'none'"],
    "worker-src": ["'self'", "blob:"],
    // Em prod (HTTPS-only), força upgrade de qualquer subrequest HTTP. Em dev
    // (HTTP localhost) esta diretiva quebra navegação após redirects de
    // server actions — browser tenta upgrade para https://localhost e falha
    // SSL. Sintoma: "This page couldn't load" após trocar senha, login etc.
    ...(isDev ? {} : { "upgrade-insecure-requests": [] }),
  };
  return Object.entries(directives)
    .map(([k, v]) => (v.length === 0 ? k : `${k} ${v.join(" ")}`))
    .join("; ");
}

const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "Content-Security-Policy", value: buildCSP() },
  // HSTS: força HTTPS por 1 ano. `preload` permite incluir o domínio na
  // lista de pré-load do Chromium (só ativar quando o domínio estiver 100%
  // HTTPS — DSF está em Vercel/HTTPS-only). Aplicar apenas em produção
  // para não atrapalhar dev local em http://localhost.
  ...(isDev
    ? []
    : [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" }]),
  // Defesa contra Cross-Origin-Embedder/Opener-Policy attacks.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  // standalone só faz sentido em Docker self-hosted. Vercel ignora.
  // Mantemos condicional via env para suportar ambos os modos:
  ...(process.env.BUILD_STANDALONE === "true" ? { output: "standalone" as const } : {}),
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "@radix-ui/react-collapsible",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-popover",
      "@radix-ui/react-select",
      "@radix-ui/react-slot",
      "@radix-ui/react-tooltip",
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
