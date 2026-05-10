#!/usr/bin/env python3
"""Extrai texto estruturado de um document.xml (.docx) para Markdown.

Uso: python extract-docx.py <document.xml>

Reconhece:
- Headings (estilo Heading1..6)
- Listas (numPr)
- Tabelas (w:tbl) → markdown table
- Parágrafos comuns
- Bold/italic dentro de runs
"""
import sys
import re
import xml.etree.ElementTree as ET

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

def text_of_run(r):
    parts = []
    bold = r.find(f"{W}rPr/{W}b") is not None
    italic = r.find(f"{W}rPr/{W}i") is not None
    for t in r.findall(f"{W}t"):
        parts.append(t.text or "")
    txt = "".join(parts)
    if not txt:
        return ""
    if bold and italic:
        return f"***{txt}***"
    if bold:
        return f"**{txt}**"
    if italic:
        return f"*{txt}*"
    return txt

def text_of_paragraph(p):
    out = []
    for child in p.iter():
        if child.tag == f"{W}r":
            out.append(text_of_run(child))
    return "".join(out).strip()

def heading_level(p):
    pStyle = p.find(f"{W}pPr/{W}pStyle")
    if pStyle is not None:
        val = pStyle.get(f"{W}val", "")
        m = re.match(r"[Hh]eading(\d)", val) or re.match(r"T[ií]tulo(\d)", val)
        if m:
            return int(m.group(1))
        if val.lower() in {"title", "titulo", "título"}:
            return 1
    return 0

def is_list_item(p):
    return p.find(f"{W}pPr/{W}numPr") is not None

def list_level(p):
    ilvl = p.find(f"{W}pPr/{W}numPr/{W}ilvl")
    if ilvl is not None:
        return int(ilvl.get(f"{W}val", 0))
    return 0

def render_table(tbl):
    rows = []
    for tr in tbl.findall(f"{W}tr"):
        cells = []
        for tc in tr.findall(f"{W}tc"):
            cell_text = " ".join(text_of_paragraph(p) for p in tc.findall(f"{W}p")).strip()
            cells.append(cell_text.replace("|", "\\|") or " ")
        rows.append(cells)
    if not rows:
        return ""
    width = max(len(r) for r in rows)
    rows = [r + [""] * (width - len(r)) for r in rows]
    md = []
    md.append("| " + " | ".join(rows[0]) + " |")
    md.append("|" + "|".join(["---"] * width) + "|")
    for r in rows[1:]:
        md.append("| " + " | ".join(r) + " |")
    return "\n".join(md)

def main():
    path = sys.argv[1]
    tree = ET.parse(path)
    body = tree.getroot().find(f"{W}body")
    out = []
    for el in body:
        tag = el.tag
        if tag == f"{W}p":
            txt = text_of_paragraph(el)
            if not txt:
                out.append("")
                continue
            lvl = heading_level(el)
            if lvl > 0:
                out.append("#" * lvl + " " + txt)
            elif is_list_item(el):
                indent = "  " * list_level(el)
                out.append(f"{indent}- {txt}")
            else:
                out.append(txt)
        elif tag == f"{W}tbl":
            out.append(render_table(el))
            out.append("")
    print("\n\n".join(out))

if __name__ == "__main__":
    main()
