import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Maximize, Minimize } from "lucide-react";
import type { Comic } from "../../types/comic";

interface ComicReaderProps {
  comic: Comic;
  pdfUrl: string;
  onBack: () => void;
  onUpdateProgress: (comicId: string, page: number, totalPages: number) => void;
}

export const ComicReader: React.FC<ComicReaderProps> = ({ comic, pdfUrl, onBack, onUpdateProgress }) => {
  const [currentPage, setCurrentPage] = useState(() => Math.max(1, comic.progress?.currentPage || 1));
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => onUpdateProgress(comic.id, currentPage, comic.totalPages), 500);
    return () => window.clearTimeout(timer);
  }, [comic.id, comic.totalPages, currentPage, onUpdateProgress]);

  const previous = useCallback(() => setCurrentPage((page) => Math.max(1, page - 1)), []);
  const next = useCallback(
    () => setCurrentPage((page) => Math.min(comic.totalPages, page + 1)),
    [comic.totalPages],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") previous();
      if (event.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [next, previous]);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await containerRef.current?.requestFullscreen();
  };

  const source = `${pdfUrl}#page=${currentPage}&zoom=page-width&toolbar=0&navpanes=0`;

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 flex flex-col bg-[#080a0f] text-slate-100">
      <header className="h-14 shrink-0 border-b border-[#1e2535] bg-[#0d1017] px-3 sm:px-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onBack} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Biblioteca</span>
          </button>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">{comic.title}</p>
            <p className="text-[10px] text-amber-400 truncate">{comic.seriesTitle} • edição #{comic.issueNumber}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={previous} disabled={currentPage <= 1} className="p-2 rounded-lg bg-slate-800 disabled:opacity-40 cursor-pointer" aria-label="Página anterior">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <label className="flex items-center gap-1 text-xs text-slate-300">
            <input
              type="number"
              min={1}
              max={comic.totalPages}
              value={currentPage}
              onChange={(event) => setCurrentPage(Math.max(1, Math.min(comic.totalPages, Number(event.target.value) || 1)))}
              className="w-14 h-8 rounded-md bg-slate-900 border border-slate-700 text-center text-white"
              aria-label="Página atual"
            />
            <span className="hidden sm:inline">de {comic.totalPages}</span>
          </label>
          <button onClick={next} disabled={currentPage >= comic.totalPages} className="p-2 rounded-lg bg-slate-800 disabled:opacity-40 cursor-pointer" aria-label="Próxima página">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={toggleFullscreen} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 cursor-pointer" aria-label="Alternar tela cheia">
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </header>

      <iframe
        key={currentPage}
        src={source}
        title={`Leitor de ${comic.title}`}
        className="flex-1 w-full border-0 bg-slate-950"
        allow="fullscreen"
      />
    </div>
  );
};
