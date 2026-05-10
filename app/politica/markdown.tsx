// Mini-renderer Markdown → JSX para servir conteúdo extraído do .docx.
// Suporta: # ## ### headings (com id auto), parágrafos, **bold**, *italic*,
// listas (- prefix com indentação por 2 espaços) e tabelas pipe-style.
// Extrai também o sumário (TOC) em ordem.
import type { JSX } from "react";

export interface TocEntry {
  id: string;
  titulo: string;
  nivel: number;
}

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  // Tokens: ***bold-italic***, **bold**, *italic*. Suportamos não-aninhado.
  const out: React.ReactNode[] = [];
  const re = /(\*\*\*([^*]+)\*\*\*|\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[2] !== undefined) {
      out.push(<strong key={`${keyPrefix}-bi-${i++}`} className="italic font-semibold">{m[2]}</strong>);
    } else if (m[3] !== undefined) {
      out.push(<strong key={`${keyPrefix}-b-${i++}`} className="font-semibold">{m[3]}</strong>);
    } else if (m[4] !== undefined) {
      out.push(<em key={`${keyPrefix}-i-${i++}`}>{m[4]}</em>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

interface ParsedTable {
  type: "table";
  rows: string[][];
}
interface ParsedHeading {
  type: "heading";
  level: number;
  text: string;
  id: string;
}
interface ParsedList {
  type: "list";
  items: { indent: number; text: string }[];
}
interface ParsedParagraph {
  type: "paragraph";
  text: string;
}
type Block = ParsedHeading | ParsedParagraph | ParsedList | ParsedTable;

function parse(md: string): Block[] {
  const lines = md.split(/\r?\n/);
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      i++;
      continue;
    }
    // Heading
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const text = h[2].trim().replace(/\*+/g, "");
      blocks.push({ type: "heading", level, text, id: slugify(text) });
      i++;
      continue;
    }
    // Tabela: linha começa com | ... | e a próxima é separadora |---|
    if (line.startsWith("|") && i + 1 < lines.length && /^\|[\s:|-]+\|$/.test(lines[i + 1])) {
      const rows: string[][] = [];
      const headerCells = splitRow(line);
      rows.push(headerCells);
      i += 2; // pula separador
      while (i < lines.length && lines[i].startsWith("|")) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      blocks.push({ type: "table", rows });
      continue;
    }
    // Lista
    const isListLine = /^(\s*)-\s+/.test(line);
    if (isListLine) {
      const items: { indent: number; text: string }[] = [];
      while (i < lines.length && /^(\s*)-\s+/.test(lines[i])) {
        const lm = /^(\s*)-\s+(.*)$/.exec(lines[i])!;
        items.push({ indent: Math.floor(lm[1].length / 2), text: lm[2] });
        i++;
      }
      blocks.push({ type: "list", items });
      continue;
    }
    // Parágrafo (1 linha; o pandoc-like dá 1 par por linha)
    blocks.push({ type: "paragraph", text: line.trim() });
    i++;
  }
  return blocks;
}

function splitRow(line: string): string[] {
  // remove primeira/última pipe e split, restaurando \| escapados
  const inner = line.replace(/^\|/, "").replace(/\|$/, "");
  return inner.split(/(?<!\\)\|/).map((c) => c.replace(/\\\|/g, "|").trim());
}

export function extractToc(md: string, maxLevel = 2): TocEntry[] {
  return parse(md)
    .filter((b): b is ParsedHeading => b.type === "heading" && b.level <= maxLevel)
    .map((h) => ({ id: h.id, titulo: h.text, nivel: h.level }));
}

export function MarkdownContent({ md }: { md: string }) {
  const blocks = parse(md);
  const elements: JSX.Element[] = [];
  blocks.forEach((b, idx) => {
    if (b.type === "heading") {
      const cls =
        b.level === 1
          ? "text-2xl font-bold text-navy-900 mt-8 mb-3 scroll-mt-24"
          : b.level === 2
          ? "text-lg font-semibold text-navy-900 mt-6 mb-2 scroll-mt-24"
          : "text-base font-semibold text-navy-800 mt-4 mb-1.5 scroll-mt-24";
      const Tag = (`h${Math.min(b.level + 1, 6)}` as unknown) as keyof JSX.IntrinsicElements;
      elements.push(
        <Tag key={idx} id={b.id} className={cls}>
          {renderInline(b.text, `h-${idx}`)}
        </Tag>,
      );
    } else if (b.type === "paragraph") {
      elements.push(
        <p key={idx} className="text-sm leading-relaxed text-neutral-800 my-2">
          {renderInline(b.text, `p-${idx}`)}
        </p>,
      );
    } else if (b.type === "list") {
      // Achata em <ul> com indentação visual por nível
      elements.push(
        <ul key={idx} className="my-2 space-y-1 text-sm text-neutral-800 list-disc pl-5">
          {b.items.map((it, j) => (
            <li
              key={j}
              style={{ marginLeft: `${it.indent * 1}rem` }}
              className="leading-relaxed"
            >
              {renderInline(it.text, `l-${idx}-${j}`)}
            </li>
          ))}
        </ul>,
      );
    } else if (b.type === "table") {
      const [header, ...body] = b.rows;
      elements.push(
        <div key={idx} className="my-4 overflow-x-auto rounded border border-neutral-200">
          <table className="w-full text-xs">
            <thead className="bg-neutral-50">
              <tr>
                {header.map((c, j) => (
                  <th key={j} className="px-3 py-2 text-left font-semibold text-navy-900 border-b border-neutral-200">
                    {renderInline(c, `th-${idx}-${j}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, ri) => (
                <tr key={ri} className="even:bg-neutral-50/40">
                  {row.map((c, ci) => (
                    <td key={ci} className="px-3 py-2 align-top text-neutral-800 border-b border-neutral-100">
                      {renderInline(c, `td-${idx}-${ri}-${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
    }
  });
  return <div className="prose-policy">{elements}</div>;
}
