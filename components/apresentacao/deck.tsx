"use client";
// Deck — navegação por teclado entre slides.
// Setas ←/→/PgUp/PgDn navegam; Esc fecha; F bota fullscreen.
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Props {
  totalSlides: number;
  voltarHref: string;
  children: React.ReactNode;
}

export function Deck({ totalSlides, voltarHref, children }: Props) {
  const router = useRouter();
  const [idx, setIdx] = useState(0);

  const ir = useCallback((delta: number) => {
    setIdx((i) => Math.min(Math.max(i + delta, 0), totalSlides - 1));
  }, [totalSlides]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault(); ir(1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault(); ir(-1);
      } else if (e.key === "Escape") {
        e.preventDefault(); router.push(voltarHref);
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        if (!document.fullscreenElement) document.documentElement.requestFullscreen();
        else document.exitFullscreen();
      } else if (e.key === "Home") {
        e.preventDefault(); setIdx(0);
      } else if (e.key === "End") {
        e.preventDefault(); setIdx(totalSlides - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ir, router, voltarHref, totalSlides]);

  // Renderiza apenas o slide atual (oculta os demais via CSS)
  const filhos = Array.isArray(children) ? children : [children];

  return (
    <div className="fixed inset-0 bg-navy-900 text-white overflow-hidden">
      {filhos.map((child, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-200 ${
            i === idx ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
          }`}
        >
          {child}
        </div>
      ))}

      {/* Controles flutuantes */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 rounded-full bg-navy-700/80 backdrop-blur px-4 py-2 text-xs">
        <button
          onClick={() => ir(-1)}
          disabled={idx === 0}
          className="px-2 py-1 rounded hover:bg-peri-600/40 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="anterior"
        >
          ←
        </button>
        <span className="tabular-nums text-peri-200">
          {idx + 1} / {totalSlides}
        </span>
        <button
          onClick={() => ir(1)}
          disabled={idx === totalSlides - 1}
          className="px-2 py-1 rounded hover:bg-peri-600/40 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="próximo"
        >
          →
        </button>
        <span className="text-neutral-500">·</span>
        <button
          onClick={() => router.push(voltarHref)}
          className="px-2 py-1 rounded hover:bg-peri-600/40 text-peri-200"
          aria-label="fechar (Esc)"
        >
          ✕ fechar
        </button>
      </div>

      {/* Dica de teclado, canto superior direito */}
      <div className="absolute top-4 right-4 z-20 text-xs text-peri-200/60 bg-navy-700/40 backdrop-blur rounded px-2 py-1">
        ← → navegar · F tela cheia · Esc fechar
      </div>
    </div>
  );
}
