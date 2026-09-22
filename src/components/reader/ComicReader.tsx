import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Expand,
  Minimize,
  Minus,
  Plus,
  RotateCcw,
  Rows3,
  Square,
  GalleryHorizontal,
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
type ReaderMode = "continuous" | "page" | "horizontal";

const ContinuousPdfPage: React.FC<{
  pdf: PDFDocumentProxy;
  pageNumber: number;
  width: number;
  brightness: number;
  onVisible: (page: number) => void;
}> = ({ pdf, pageNumber, width, brightness, onVisible }) => {
  const holderRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shouldRender, setShouldRender] = useState(pageNumber <= 2);

  useEffect(() => {
    const holder = holderRef.current;
    if (!holder) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) setShouldRender(true);
        if (entry.intersectionRatio > 0.55) onVisible(pageNumber);
      }
    }, { rootMargin: "900px 0px", threshold: [0.1, 0.55] });
    observer.observe(holder);
    return () => observer.disconnect();
  }, [onVisible, pageNumber]);

  useEffect(() => {
    if (!shouldRender || !canvasRef.current || width <= 0) return;
    let active = true;
    let task: RenderTask | null = null;
    pdf.getPage(pageNumber).then((page) => {
      if (!active || !canvasRef.current) return;
      const base = page.getViewport({ scale: 1 });
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: (width / base.width) * ratio });
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) return;
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${viewport.width / ratio}px`;
      canvas.style.height = `${viewport.height / ratio}px`;
      task = page.render({ canvas, canvasContext: context, viewport });
      return task.promise;
    }).catch((renderError) => {
      if ((renderError as Error).name !== "RenderingCancelledException") console.error(renderError);
    });
    return () => { active = false; task?.cancel(); };
  }, [pageNumber, pdf, shouldRender, width]);

  return (
    <div ref={holderRef} data-reader-page={pageNumber} className="reader-continuous-page" style={{ width, filter: `brightness(${brightness}%)` }}>
      <canvas ref={canvasRef} />
      {!shouldRender && <span className="reader-page-placeholder">Página {pageNumber}</span>}
    </div>
  );
};

export const ComicReader: React.FC<ComicReaderProps> = ({ comic, pdfUrl, onBack, onUpdateProgress }) => {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(() => Math.max(1, comic.progress?.currentPage || 1));
  const [zoom, setZoom] = useState(1);
  const [readerMode, setReaderMode] = useState<ReaderMode>(() => (localStorage.getItem("biblioteca_reader_mode") as ReaderMode) || "page");
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
  const panRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);
  const zoomAnchorRef = useRef<{ contentX: number; contentY: number; focusX: number; focusY: number } | null>(null);
  const [stageWidth, setStageWidth] = useState(0);
  const [turnDirection, setTurnDirection] = useState<"next" | "previous">("next");

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
    if (readerMode === "continuous" || !pdf || !canvasRef.current || !stageRef.current) return;
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
  }, [currentPage, pdf, readerMode, zoom]);

  useEffect(() => {
    renderPage();
    const onResize = () => renderPage();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [renderPage]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const update = () => setStageWidth(stage.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    localStorage.setItem("biblioteca_reader_mode", readerMode);
    setZoom(1);
    requestAnimationFrame(() => stageRef.current?.scrollTo({ top: 0, left: 0 }));
  }, [readerMode]);

  useEffect(() => {
    if (!zoomAnchorRef.current) return;
    const anchor = zoomAnchorRef.current;
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => {
      const stage = stageRef.current;
      if (!stage) return;
      stage.scrollLeft = anchor.contentX * zoom - anchor.focusX;
      stage.scrollTop = anchor.contentY * zoom - anchor.focusY;
      zoomAnchorRef.current = null;
    }));
    return () => cancelAnimationFrame(frame);
  }, [zoom]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => onUpdateProgress(comic.id, currentPage, pdf?.numPages ?? comic.totalPages),
      700,
    );
    return () => window.clearTimeout(timer);
  }, [comic.id, comic.totalPages, currentPage, onUpdateProgress, pdf?.numPages]);

  const totalPages = pdf?.numPages ?? comic.totalPages;
  const moveToPage = useCallback((target: number, direction: "next" | "previous") => {
    const page = Math.min(totalPages, Math.max(1, target));
    setTurnDirection(direction);
    setCurrentPage(page);
    if (readerMode === "continuous") {
      requestAnimationFrame(() => stageRef.current?.querySelector(`[data-reader-page="${page}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }, [readerMode, totalPages]);
  const previous = useCallback(() => moveToPage(currentPage - 1, "previous"), [currentPage, moveToPage]);
  const next = useCallback(() => moveToPage(currentPage + 1, "next"), [currentPage, moveToPage]);

  const changeZoom = useCallback((nextZoom: number, clientX?: number, clientY?: number) => {
    const stage = stageRef.current;
    const value = Math.min(3, Math.max(0.7, nextZoom));
    if (stage) {
      const rect = stage.getBoundingClientRect();
      const focusX = clientX === undefined ? stage.clientWidth / 2 : clientX - rect.left;
      const focusY = clientY === undefined ? stage.clientHeight / 2 : clientY - rect.top;
      zoomAnchorRef.current = {
        contentX: (stage.scrollLeft + focusX) / zoom,
        contentY: (stage.scrollTop + focusY) / zoom,
        focusX,
        focusY,
      };
    }
    setZoom(value);
  }, [zoom]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") previous();
      if (event.key === "ArrowRight") next();
      if (event.key === "+" || event.key === "=") changeZoom(zoom + 0.1);
      if (event.key === "-") changeZoom(zoom - 0.1);
      if (event.key === "0") changeZoom(1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [changeZoom, next, previous, zoom]);

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
    // Preserve native one-finger scrolling in continuous mode at the default zoom.
    if (readerMode === "continuous" && zoom <= 1.05) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 1) {
      swipeStartRef.current = { x: event.clientX, y: event.clientY };
      if (zoom > 1.05 && stageRef.current) {
        panRef.current = {
          x: event.clientX,
          y: event.clientY,
          scrollLeft: stageRef.current.scrollLeft,
          scrollTop: stageRef.current.scrollTop,
        };
      }
    }
    if (pointersRef.current.size === 2) {
      pinchRef.current = { distance: distanceBetweenPointers(), zoom };
      swipeStartRef.current = null;
      panRef.current = null;
    }
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 1 && panRef.current && stageRef.current) {
      stageRef.current.scrollLeft = panRef.current.scrollLeft - (event.clientX - panRef.current.x);
      stageRef.current.scrollTop = panRef.current.scrollTop - (event.clientY - panRef.current.y);
    }
    if (pointersRef.current.size === 2 && pinchRef.current) {
      const ratio = distanceBetweenPointers() / Math.max(1, pinchRef.current.distance);
      const points = [...pointersRef.current.values()];
      changeZoom(pinchRef.current.zoom * ratio, (points[0].x + points[1].x) / 2, (points[0].y + points[1].y) / 2);
    }
  };

  const handlePointerUp = (event: React.PointerEvent) => {
    const start = swipeStartRef.current;
    if (start && pointersRef.current.size === 1 && zoom <= 1.05 && readerMode !== "continuous") {
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
    panRef.current = null;
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
          <div className="reader-setting-row reader-mode-row">
            <span>Modo</span>
            <div className="reader-mode-options">
              <button onClick={() => setReaderMode("continuous")} className={readerMode === "continuous" ? "active" : ""} title="Rolagem vertical contínua"><Rows3 /> Vertical</button>
              <button onClick={() => setReaderMode("page")} className={readerMode === "page" ? "active" : ""} title="Uma página por vez"><Square /> Página</button>
              <button onClick={() => setReaderMode("horizontal")} className={readerMode === "horizontal" ? "active" : ""} title="Folhear horizontalmente"><GalleryHorizontal /> Horizontal</button>
            </div>
          </div>
        </aside>
      )}

      <main
        ref={stageRef}
        className={`reader-stage texture-${texture} mode-${readerMode} ${zoom > 1.05 ? "reader-stage-zoomed" : ""}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={(event) => {
          if (!event.ctrlKey) return;
          event.preventDefault();
          changeZoom(zoom + (event.deltaY < 0 ? 0.1 : -0.1), event.clientX, event.clientY);
        }}
      >
        {readerMode === "continuous" && pdf ? (
          <div className="reader-continuous">
            {Array.from({ length: totalPages }, (_, index) => (
              <ContinuousPdfPage
                key={index + 1}
                pdf={pdf}
                pageNumber={index + 1}
                width={Math.max(280, Math.min(920, stageWidth - 28)) * zoom}
                brightness={brightness}
                onVisible={setCurrentPage}
              />
            ))}
          </div>
        ) : (
          <div key={`${currentPage}-${readerMode}`} className={`reader-page turn-${turnDirection}`} style={{ filter: `brightness(${brightness}%)` }}>
            <canvas ref={canvasRef} />
            <div className="reader-paper-grain" />
          </div>
        )}
        {isRendering && readerMode !== "continuous" && <div className="reader-loading"><span /></div>}
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
          <button onClick={() => changeZoom(zoom - 0.1)} aria-label="Reduzir zoom"><Minus /></button>
          <button onClick={() => changeZoom(1)} className="reader-reset-zoom" aria-label="Redefinir zoom para 100%"><RotateCcw /><span>{Math.round(zoom * 100)}%</span></button>
          <button onClick={() => changeZoom(zoom + 0.1)} aria-label="Aumentar zoom"><Plus /></button>
        </div>
      </footer>
    </div>
  );
};
