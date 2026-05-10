// Funções para fatiar o markdown bruto da Política em cláusulas/anexos.
// Os marcadores aparecem como linhas tipo `**CLÁUSULA PRIMEIRA – ...**` ou
// `**ANEXO I – ...**`. Devolvemos a substring desde o marcador (inclusive)
// até o próximo marcador (exclusivo), preservando a formatação markdown.

import { POLITICA_MD } from "./politica";

const MARCADOR_RE = /^\*\*(CLÁUSULA\s+\S+|ANEXO\s+\S+|ANEXOS\s+\S+|ANEXO\s+DE\s+ASSINATURAS).*?\*\*$/gm;

interface SecaoIndex {
  marcador: string; // "CLÁUSULA NONA", "ANEXO VII"
  inicio: number;   // index no md
  fim: number;      // index do próximo marcador (ou EOF)
}

let _indexCache: SecaoIndex[] | null = null;

function indexar(): SecaoIndex[] {
  if (_indexCache) return _indexCache;
  const matches: { texto: string; start: number }[] = [];
  let m: RegExpExecArray | null;
  MARCADOR_RE.lastIndex = 0;
  while ((m = MARCADOR_RE.exec(POLITICA_MD)) !== null) {
    matches.push({ texto: m[0], start: m.index });
  }
  const out: SecaoIndex[] = [];
  for (let i = 0; i < matches.length; i++) {
    const { texto, start } = matches[i];
    // Marcador limpo: "CLÁUSULA PRIMEIRA" ou "ANEXO I" ou "ANEXO DE ASSINATURAS"
    const inner = texto.replace(/^\*\*|\*\*$/g, "").split(" – ")[0].split(/\s*[-–]\s*/)[0].trim();
    const fim = i + 1 < matches.length ? matches[i + 1].start : POLITICA_MD.length;
    out.push({ marcador: inner.toUpperCase(), inicio: start, fim });
  }
  _indexCache = out;
  return out;
}

/**
 * Extrai as cláusulas correspondentes (concatenadas) do POLITICA_MD.
 * `marcadores` ex: ["CLÁUSULA NONA"]. Aceita variações de capitalização.
 */
export function extrairClausulas(marcadores: string[]): string {
  const idx = indexar();
  const partes: string[] = [];
  for (const alvo of marcadores) {
    const alvoUp = alvo.toUpperCase();
    const sec = idx.find((s) => s.marcador.startsWith(alvoUp));
    if (sec) {
      partes.push(POLITICA_MD.slice(sec.inicio, sec.fim).trim());
    }
  }
  return partes.join("\n\n");
}

/**
 * Extrai os anexos correspondentes do POLITICA_MD.
 * `anexos` ex: ["ANEXO VII"].
 */
export function extrairAnexos(anexos: string[]): string {
  return extrairClausulas(anexos); // mesmo mecanismo, marcadores diferentes
}

/** Util para a busca: devolve o texto bruto inteiro de uma cláusula/anexo. */
export function corpoDe(marcador: string): string {
  const idx = indexar();
  const sec = idx.find((s) => s.marcador.startsWith(marcador.toUpperCase()));
  return sec ? POLITICA_MD.slice(sec.inicio, sec.fim) : "";
}
