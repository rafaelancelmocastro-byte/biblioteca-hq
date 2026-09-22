import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Expand,
  Minimize,
  Minus,
  Plus,
  Settings2,
  SunMedium,
} from "lucide-react";
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy, type RenderTask } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { Comic } from "../../types/comic";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface ComicReaderProps {
  comic: Comic;
  pdfUrl: string;
  onBack: () => void;
  onUpdateProgress: (comicId: string, page: number, totalPages: number) => void;
}

type Texture = "clean" | "paper" | "warm";

export const ComicReader: React.FC<ComicReaderProps> = ({ comic, pdfUrl, onBack, onUpdateProgress }) => {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(() => Math.max(1, comic.progress?.currentPage || 1));
  const [zoom, setZoom] = useState(1);
  const [brightness, setBrightness] = useState(100);
  const [texture, setTexture] = useState<Texture>("clean");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRendering, setIsRendering] = useState(true);
  const [error, setError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    let active = true;
    const task = getDocument({ url: pdfUrl, withCredentials: false });
    task.promise
      .then((document) => {
        if (!active) return;
        setPdf(document);
        setCurrentPage((page) => Math.min(page, document.numPages));
      })
      .catch(() => active && setError("Não foi possível carregar este PDF."));
    return () => {
      active = false;
      task.destroy();
    };
  }, [pdfUrl]);

  const renderPage = useCallback(async () => {
    if (!pdf || !canvasRef.current || !stageRef.current) return;
    renderTaskRef.current?.cancel();
    setIsRendering(true);
    try {
      const page = await pdf.getPage(currentPage);
      const baseViewport = page.getViewport({ scale: 1 });
      const availableWidth = Math.max(280, stageRef.current.clientWidth - 32);
      const fitScale = Math.min(2.2, availableWidth / baseViewport.width);
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: fitScale * zoom * pixelRatio });
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) return;
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${viewport.width / pixelRatio}px`;
      canvas.style.height = `${viewport.height / pixelRatio}px`;
      const renderTask = page.render({ canvas, canvasContext: context, viewport });
      renderTaskRef.current = renderTask;
      await renderTask.promise;
      setError("");
    } catch (renderError) {
      if ((renderError as Error).name !== "RenderingCancelledException") {
        setError("Não foi possível renderizar esta página.");
      }
    } finally {
      setIsRendering(false);
    }
  }, [currentPage, pdf, zoom]);

  useEffect(() => {
    renderPage();
    const onResize = () => renderPage();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [renderPage]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => onUpdateProgress(comic.id, currentPage, pdf?.numPages ?? comic.totalPages),
      700,
    );
    return () => window.clearTimeout(timer);
  }, [comic.id, comic.totalPages, currentPage, onUpdateProgress, pdf?.numPages]);

  const totalPages = pdf?.numPages ?? comic.totalPages;
  const previous = useCallback(() => setCurrentPage((page) => Math.max(1, page - 1)), []);
  const next = useCallback(() => setCurrentPage((page) => Math.min(totalPages, page + 1)), [totalPages]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") previous();
      if (event.key === "ArrowRight") next();
      if (event.key === "+" || event.key === "=") setZoom((value) => Math.min(3, value + 0.1));
      if (event.key === "-") setZoom((value) => Math.max(0.7, value - 0.1));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [next, previous]);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const distanceBetweenPointers = () => {
    const points = [...pointersRef.current.values()];
    if (points.length < 2) return 0;
    return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
  };

  const handlePointerDown = (event: React.PointerEvent) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 1) swipeStartRef.current = { x: event.clientX, y: event.clientY };
    if (pointersRef.current.size === 2) {
      pinchRef.current = { distance: distanceBetweenPointers(), zoom };
      swipeStartRef.current = null;
    }
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 2 && pinchRef.current) {
      const ratio = distanceBetweenPointers() / Math.max(1, pinchRef.current.distance);
      setZoom(Math.min(3, Math.max(0.7, pinchRef.current.zoom * ratio)));
    }
  };

  const handlePointerUp = (event: React.PointerEvent) => {
    const start = swipeStartRef.current;
    if (start && pointersRef.current.size === 1 && zoom <= 1.05) {
      const deltaX = event.clientX - start.x;
      const deltaY = event.clientY - start.y;
      if (Math.abs(deltaX) > 70 && Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX < 0) next();
        else previous();
      }
    }
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    swipeStartRef.current = null;
  };

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await shellRef.current?.requestFullscreen();
  };

  return (
    <div ref={shellRef} className="reader-shell fixed inset-0 z-50 flex flex-col text-[#f4eee9]">
      <header className="reader-topbar">
        <button onClick={onBack} className="reader-icon-button" aria-label="Voltar para a biblioteca">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{comic.title}</p>
          <p className="text-[11px] text-white/50 truncate">{comic.seriesTitle} · {comic.publisher}</p>
        </div>
        <button onClick={() => setIsSettingsOpen((value) => !value)} className="reader-icon-button" aria-label="Ajustes de leitura">
          <Settings2 className="w-5 h-5" />
        </button>
        <button onClick={toggleFullscreen} className="reader-icon-button" aria-label="Alternar tela cheia">
          {isFullscreen ? <Minimize className="w-5 h-5" /> : <Expand className="w-5 h-5" />}
        </button>
      </header>

      {isSettingsOpen && (
        <aside className="reader-settings" aria-label="Preferências de leitura">
          <label className="reader-setting-row">
            <span><SunMedium className="w-4 h-4" /> Brilho</span>
            <input type="range" min="55" max="125" value={brightness} onChange={(event) => setBrightness(Number(event.target.value))} />
            <strong>{brightness}%</strong>
          </label>
          <div className="reader-setting-row">
            <span>Textura</span>
            <div className="flex gap-1.5">
              {(["clean", "paper", "warm"] as Texture[]).map((option) => (
                <button key={option} onClick={() => setTexture(option)} className={texture === option ? "active" : ""}>
                  {option === "clean" ? "Limpa" : option === "paper" ? "Papel" : "Quente"}
                </button>
              ))}
            </div>
          </div>
        </aside>
      )}

      <main
        ref={stageRef}
        className={`reader-stage texture-${texture}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={(event) => {
          if (!event.ctrlKey) return;
          event.preventDefault();
          setZoom((value) => Math.min(3, Math.max(0.7, value + (event.deltaY < 0 ? 0.1 : -0.1))));
        }}
      >
        <div className="reader-page" style={{ filter: `brightness(${brightness}%)` }}>
          <canvas ref={canvasRef} />
          <div className="reader-paper-grain" />
        </div>
        {isRendering && <div className="reader-loading"><span /></div>}
        {error && <div className="reader-error">{error}</div>}
      </main>

      <footer className="reader-dock">
        <button onClick={previous} disabled={currentPage <= 1} aria-label="Página anterior"><ChevronLeft /></button>
        <div className="reader-page-control">
          <input
            type="range"
            min="1"
            max={totalPages}
            value={currentPage}
            onChange={(event) => setCurrentPage(Number(event.target.value))}
            aria-label="Progresso da leitura"
          />
          <span>{currentPage} <small>/ {totalPages}</small></span>
        </div>
        <button onClick={next} disabled={currentPage >= totalPages} aria-label="Próxima página"><ChevronRight /></button>
        <div className="reader-zoom">
          <button onClick={() => setZoom((value) => Math.max(0.7, value - 0.1))}><Minus /></button>
          <span>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((value) => Math.min(3, value + 0.1))}><Plus /></button>
        </div>
      </footer>
    </div>
  );
};
