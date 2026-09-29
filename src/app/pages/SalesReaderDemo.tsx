import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Maximize2, Minus, Plus, RotateCcw, X } from "lucide-react";

const PAGES = [1, 2, 3, 4, 5].map((page) => `/sales/demo/page-${page}.svg`);

export function SalesReaderDemo({ onClose }: { onClose: () => void }) {
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [fit, setFit] = useState<"height" | "width">("height");
  const touchStart = useRef<number | null>(null);

  const go = (delta: number) => setPage((current) => Math.min(PAGES.length - 1, Math.max(0, current + delta)));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="sales-demo-reader" role="dialog" aria-modal="true" aria-label="Demonstração do leitor">
      <header className="sales-demo-reader__topbar">
        <button type="button" onClick={onClose} className="sales-demo-reader__back">
          <ArrowLeft /> <span>Voltar à apresentação</span>
        </button>
        <div className="sales-demo-reader__title">
          <strong>Amostra de leitura</strong>
          <span>5 páginas · demonstração</span>
        </div>
        <button type="button" onClick={onClose} className="sales-demo-reader__close" aria-label="Fechar demonstração"><X /></button>
      </header>

      <div className="sales-demo-reader__stage">
        <button type="button" className="sales-demo-reader__nav sales-demo-reader__nav--left" onClick={() => go(-1)} disabled={page === 0} aria-label="Página anterior"><ChevronLeft /></button>
        <div
          className="sales-demo-reader__viewport"
          onTouchStart={(event) => { touchStart.current = event.touches[0]?.clientX ?? null; }}
          onTouchEnd={(event) => {
            if (touchStart.current == null) return;
            const diff = (event.changedTouches[0]?.clientX ?? touchStart.current) - touchStart.current;
            if (Math.abs(diff) > 45) go(diff < 0 ? 1 : -1);
            touchStart.current = null;
          }}
        >
          <img
            key={PAGES[page]}
            src={PAGES[page]}
            alt={`Página de demonstração ${page + 1}`}
            className={`sales-demo-reader__page sales-demo-reader__page--${fit}`}
            style={{ transform: `scale(${zoom / 100})` }}
            draggable={false}
          />
        </div>
        <button type="button" className="sales-demo-reader__nav sales-demo-reader__nav--right" onClick={() => go(1)} disabled={page === PAGES.length - 1} aria-label="Próxima página"><ChevronRight /></button>
      </div>

      <footer className="sales-demo-reader__controls">
        <div className="sales-demo-reader__counter">Pág. <strong>{page + 1}</strong> / {PAGES.length}</div>
        <div className="sales-demo-reader__control-group" aria-label="Ajustes da página">
          <button type="button" onClick={() => setZoom((value) => Math.max(100, value - 10))} disabled={zoom <= 100} aria-label="Diminuir zoom"><Minus /></button>
          <span>{zoom}%</span>
          <button type="button" onClick={() => setZoom((value) => Math.min(180, value + 10))} disabled={zoom >= 180} aria-label="Aumentar zoom"><Plus /></button>
          <button type="button" onClick={() => setZoom(100)} aria-label="Restaurar zoom"><RotateCcw /></button>
          <button type="button" onClick={() => setFit((value) => value === "height" ? "width" : "height")} className="sales-demo-reader__fit"><Maximize2 /><span>{fit === "height" ? "Ajustar largura" : "Ajustar altura"}</span></button>
        </div>
        <div className="sales-demo-reader__hint">Arraste no celular ou use ← → no teclado</div>
      </footer>
    </div>
  );
}
