"use client";
// Deck — navegação por teclado entre slides.
// Setas ←/→/PgUp/PgDn navegam; Esc fecha; F bota fullscreen.
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, X, Maximize2 } from "lucide-react";

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

  const filhos = Array.isArray(children) ? children : [children];
  const progresso = ((idx + 1) / totalSlides) * 100;

  return (
    <div className="fixed inset-0 bg-navy-900 text-white overflow-hidden">
      {/* Barra de progresso superior */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-navy-800 z-30">
        <div
          className="h-full bg-gradient-to-r from-peri-400 to-mint-400 transition-all duration-300"
          style={{ width: `${progresso}%` }}
          aria-hidden
        />
      </div>

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
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full bg-navy-700/80 backdrop-blur px-3 py-1.5 text-xs ring-1 ring-peri-400/30">
        <button
          onClick={() => ir(-1)}
          disabled={idx === 0}
          className="p-1.5 rounded-full hover:bg-peri-600/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Slide anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="tabular-nums text-peri-100 px-2 font-medium">
          {idx + 1} <span className="text-peri-300">/ {totalSlides}</span>
        </span>
        <button
          onClick={() => ir(1)}
          disabled={idx === totalSlides - 1}
          className="p-1.5 rounded-full hover:bg-peri-600/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Próximo slide"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <span className="text-peri-700 mx-1">|</span>
        <button
          onClick={() => {
            if (!document.fullscreenElement) document.documentElement.requestFullscreen();
            else document.exitFullscreen();
          }}
          className="p-1.5 rounded-full hover:bg-peri-600/40 transition-colors"
          aria-label="Tela cheia"
          title="F — tela cheia"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => router.push(voltarHref)}
          className="p-1.5 rounded-full hover:bg-peri-600/40 transition-colors text-peri-200"
          aria-label="Fechar (Esc)"
          title="Esc"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Dica de teclado, canto superior direito */}
      <div className="absolute top-3 right-3 z-20 text-[10px] text-peri-200/70 bg-navy-700/30 backdrop-blur rounded px-2 py-1 hidden md:block">
        ← → navegar · F tela cheia · Esc fechar
      </div>
    </div>
  );
}
