// Busca client/server-side simples sobre o conteúdo da Política.
// Indexa: títulos + resumos + corpo dos temas + corpo dos documentos integrais.
// Ranking: título(3) > resumo(2) > corpo(1).

import { TEMAS, type TemaPolitica } from "@/app/politica/conteudo/temas";
import { extrairClausulas, extrairAnexos } from "@/app/politica/conteudo/extratos";

export interface ResultadoBusca {
  href: string;
  titulo: string;
  contexto: string;     // breadcrumb-like ("Política · Modelo econômico")
  snippet: string;      // texto curto com <mark> destacando o match
  score: number;
}

interface DocIndex {
  href: string;
  titulo: string;
  contexto: string;
  pesoTitulo: number;
  pesoCorpo: number;
  titulos: string;      // texto-fonte para match no título
  resumos: string;
  corpo: string;
}

let _idx: DocIndex[] | null = null;

function construirIndice(): DocIndex[] {
  if (_idx) return _idx;
  const docs: DocIndex[] = [];

  // Cada tema vira um documento indexado
  for (const t of TEMAS) {
    const corpo = [extrairClausulas(t.clausulas), extrairAnexos(t.anexos)].join("\n\n");
    docs.push({
      href: `/politica/${t.slug}`,
      titulo: t.titulo,
      contexto: contextoDe(t),
      pesoTitulo: 3,
      pesoCorpo: 1,
      titulos: t.titulo,
      resumos: [t.resumoCurto, ...t.resumoExecutivo].join("\n"),
      corpo,
    });
  }

  // Documentos integrais como fallback de busca
  docs.push({
    href: "/politica/documento-completo",
    titulo: "Documento completo da Política",
    contexto: "Política · Documento integral",
    pesoTitulo: 2,
    pesoCorpo: 1,
    titulos: "Política completa documento integral cláusula anexo",
    resumos: "",
    corpo: "", // o corpo já está coberto pelos temas; evitar duplicar
  });
  docs.push({
    href: "/politica/relatorio-tecnico",
    titulo: "Relatório técnico WRE",
    contexto: "Política · Relatório",
    pesoTitulo: 2,
    pesoCorpo: 1,
    titulos: "Relatório técnico WRE revisão recomendações",
    resumos: "",
    corpo: "",
  });

  _idx = docs;
  return docs;
}

function contextoDe(t: TemaPolitica): string {
  const grupoLabel: Record<TemaPolitica["grupo"], string> = {
    fundamentos: "Fundamentos",
    trilha: "Trilha societária",
    "modelo-economico": "Modelo econômico",
    "ciclo-vida": "Ciclo de vida",
  };
  return `Política · ${grupoLabel[t.grupo]}`;
}

function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// O snippet é renderizado via dangerouslySetInnerHTML em
// app/politica/buscar/page.tsx para mostrar o highlight <mark>. Isso obriga
// escapar TUDO que vem de `corpo` antes — defense-in-depth: hoje `corpo` é
// estático (lib/politica/conteudo), mas se algum dia virar user-input
// (busca em comentário/descrição), a saída continua segura.
function escaparHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function snippetDe(corpo: string, termoNormalizado: string, termoOriginal: string): string {
  if (!corpo) return "";
  const corpoNorm = normalizar(corpo);
  const idx = corpoNorm.indexOf(termoNormalizado);
  if (idx < 0) return "";
  const inicio = Math.max(0, idx - 60);
  const fim = Math.min(corpo.length, idx + termoOriginal.length + 80);
  let trecho = corpo.slice(inicio, fim).replace(/\s+/g, " ").trim();
  if (inicio > 0) trecho = "…" + trecho;
  if (fim < corpo.length) trecho = trecho + "…";
  // 1. Escape integral
  const escapado = escaparHtml(trecho);
  // 2. Highlight (case-insensitive) sobre o texto JÁ escapado. Mantém a
  // capitalização original do match e re-escapa por garantia.
  const termoEscapadoRegex = termoOriginal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(${termoEscapadoRegex})`, "gi");
  return escapado.replace(re, (m) => `<mark>${escaparHtml(m)}</mark>`);
}

export function buscar(termo: string, limite = 20): ResultadoBusca[] {
  const t = termo.trim();
  if (t.length < 2) return [];
  const idx = construirIndice();
  const tn = normalizar(t);
  const out: ResultadoBusca[] = [];

  for (const d of idx) {
    let score = 0;
    if (normalizar(d.titulos).includes(tn)) score += d.pesoTitulo * 10;
    if (normalizar(d.resumos).includes(tn)) score += 2 * 5;
    const ocorrenciasCorpo = (() => {
      const cn = normalizar(d.corpo);
      let n = 0, p = 0;
      while ((p = cn.indexOf(tn, p)) !== -1) { n++; p += tn.length; if (n > 10) break; }
      return n;
    })();
    score += ocorrenciasCorpo * d.pesoCorpo;

    if (score > 0) {
      const snip =
        snippetDe(d.corpo, tn, t) ||
        snippetDe(d.resumos, tn, t) ||
        d.resumos.split("\n")[0]?.slice(0, 160) ||
        "";
      out.push({
        href: d.href,
        titulo: d.titulo,
        contexto: d.contexto,
        snippet: snip,
        score,
      });
    }
  }

  out.sort((a, b) => b.score - a.score);
  return out.slice(0, limite);
}
