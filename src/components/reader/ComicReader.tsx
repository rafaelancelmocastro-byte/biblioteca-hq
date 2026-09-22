import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
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
  Trash2,
} from "lucide-react";
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy, type RenderTask } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { Comic } from "../../types/comic";
import { clearOffline, listOffline } from "../../services/offlineLibrary";
import { supabase } from "../../services/supabaseClient";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface ComicReaderProps {
  comic: Comic;
  pdfUrl?: string;
  pdfData?: Uint8Array;
  onBack: () => void;
  onUpdateProgress: (comicId: string, page: number, totalPages: number) => void;
}

type Texture = "clean" | "paper" | "warm";
type ReaderMode = "continuous" | "page" | "horizontal" | "spread";

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

export const ComicReader: React.FC<ComicReaderProps> = ({ comic, pdfUrl, pdfData, onBack, onUpdateProgress }) => {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(() => Math.max(1, comic.progress?.currentPage || 1));
  const [zoom, setZoom] = useState(1);
  const [readerMode, setReaderMode] = useState<ReaderMode>(() => (localStorage.getItem("biblioteca_reader_mode") as ReaderMode) || "page");
  const [readingDirection, setReadingDirection] = useState<"ltr" | "rtl">(comic.readingDirection || (comic.contentType === "manga" ? "rtl" : "ltr"));
  const [brightness, setBrightness] = useState(100);
  const [texture, setTexture] = useState<Texture>("clean");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [offlineStorage, setOfflineStorage] = useState<{ userId: string; megabytes: number } | null>(null);
  const [isRendering, setIsRendering] = useState(true);
  const [error, setError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const secondCanvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const secondRenderTaskRef = useRef<RenderTask | null>(null);
  const didSwipeRef = useRef(false);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const panRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);
  const zoomAnchorRef = useRef<{ contentX: number; contentY: number; focusX: number; focusY: number } | null>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const touchPinchRef = useRef<{ distance: number; zoom: number } | null>(null);
  const touchPanRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);
  const zoomValueRef = useRef(zoom);
  const changeZoomRef = useRef<(next: number, x?: number, y?: number) => void>(() => {});
  const [turnDirection, setTurnDirection] = useState<"next" | "previous">("next");
  useEffect(() => { if (!isSettingsOpen || !supabase) return; void supabase.auth.getSession().then(async ({ data }) => { if (!data.session) return; const items = await listOffline(data.session.user.id); setOfflineStorage({ userId: data.session.user.id, megabytes: items.reduce((sum, item) => sum + item.size, 0) / 1048576 }); }); }, [isSettingsOpen]);

  useEffect(() => {
    let active = true;
    const task = pdfData ? getDocument({ data: pdfData }) : getDocument({ url: pdfUrl, withCredentials: false });
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
  }, [pdfUrl, pdfData]);

  const renderPage = useCallback(async () => {
    if (readerMode === "continuous" || !pdf || !canvasRef.current || !stageRef.current) return;
    renderTaskRef.current?.cancel();
    setIsRendering(true);
    try {
      const page = await pdf.getPage(currentPage);
      const baseViewport = page.getViewport({ scale: 1 });
      const stage = stageRef.current;
      const style = window.getComputedStyle(stage);
      const availableWidth = Math.max(1, stage.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight));
      const availableHeight = Math.max(1, stage.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom));
      const hasSecond = readerMode === "spread" && currentPage > 1 && currentPage + 1 <= pdf.numPages;
      const fitScale = Math.min((hasSecond ? availableWidth / 2 : availableWidth) / baseViewport.width, availableHeight / baseViewport.height);
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
      if (hasSecond && secondCanvasRef.current) {
        secondRenderTaskRef.current?.cancel();
        const secondPage = await pdf.getPage(currentPage + 1);
        const secondBase = secondPage.getViewport({ scale: 1 });
        const secondViewport = secondPage.getViewport({ scale: Math.min((availableWidth / 2) / secondBase.width, availableHeight / secondBase.height) * zoom * pixelRatio });
        const secondCanvas = secondCanvasRef.current;
        const secondContext = secondCanvas.getContext("2d", { alpha: false });
        if (secondContext) {
          secondCanvas.width = Math.floor(secondViewport.width);
          secondCanvas.height = Math.floor(secondViewport.height);
          secondCanvas.style.width = `${secondViewport.width / pixelRatio}px`;
          secondCanvas.style.height = `${secondViewport.height / pixelRatio}px`;
          const secondTask = secondPage.render({ canvas: secondCanvas, canvasContext: secondContext, viewport: secondViewport });
          secondRenderTaskRef.current = secondTask;
          await secondTask.promise;
        }
      }
      setError("");
    } catch (renderError) {
      if ((renderError as Error).name !== "RenderingCancelledException") {
        setError("Não foi possível renderizar esta página.");
      }
    } finally {
      setIsRendering(false);
    }
  }, [currentPage, pdf, readerMode, zoom, stageSize]);

  useEffect(() => {
    renderPage();
    const onResize = () => renderPage();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [renderPage]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const update = () => {
      const style = getComputedStyle(stage);
      setStageSize({
        width: Math.max(1, stage.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)),
        height: Math.max(1, stage.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)),
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    localStorage.setItem("biblioteca_reader_mode", readerMode);
    if (readerMode === "spread") setCurrentPage((page) => page > 1 && page % 2 === 1 ? page - 1 : page);
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
      () => onUpdateProgress(comic.id, Math.min(currentPage + (readerMode === "spread" && currentPage > 1 ? 1 : 0), pdf?.numPages ?? comic.totalPages), pdf?.numPages ?? comic.totalPages),
      700,
    );
    return () => window.clearTimeout(timer);
  }, [comic.id, comic.totalPages, currentPage, onUpdateProgress, pdf?.numPages, readerMode]);

  const totalPages = pdf?.numPages ?? comic.totalPages;
  const moveToPage = useCallback((target: number, direction: "next" | "previous") => {
    const page = Math.min(totalPages, Math.max(1, target));
    setTurnDirection(direction);
    setCurrentPage(page);
    if (readerMode === "continuous") {
      requestAnimationFrame(() => stageRef.current?.querySelector(`[data-reader-page="${page}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }, [readerMode, totalPages]);
  const previous = useCallback(() => moveToPage(currentPage - (readerMode === "spread" && currentPage > 2 ? 2 : 1), "previous"), [currentPage, moveToPage, readerMode]);
  const next = useCallback(() => {
    if (readerMode === "spread" && currentPage > 1 && currentPage + 1 >= totalPages) return;
    moveToPage(currentPage + (readerMode === "spread" && currentPage > 1 ? 2 : 1), "next");
  }, [currentPage, moveToPage, readerMode, totalPages]);

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
  zoomValueRef.current = zoom;
  changeZoomRef.current = changeZoom;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || readerMode !== "continuous") return;
    const distance = (touches: TouchList) => Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
    const start = (event: TouchEvent) => {
      if (event.touches.length === 2) { touchPinchRef.current = { distance: distance(event.touches), zoom: zoomValueRef.current }; touchPanRef.current = null; }
      else if (event.touches.length === 1 && zoomValueRef.current > 1.05) touchPanRef.current = { x: event.touches[0].clientX, y: event.touches[0].clientY, scrollLeft: stage.scrollLeft, scrollTop: stage.scrollTop };
    };
    const move = (event: TouchEvent) => {
      if (event.touches.length === 1 && touchPanRef.current && zoomValueRef.current > 1.05) {
        event.preventDefault();
        stage.scrollLeft = touchPanRef.current.scrollLeft - (event.touches[0].clientX - touchPanRef.current.x);
        stage.scrollTop = touchPanRef.current.scrollTop - (event.touches[0].clientY - touchPanRef.current.y);
        return;
      }
      if (event.touches.length !== 2 || !touchPinchRef.current) return;
      event.preventDefault();
      const focusX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
      const focusY = (event.touches[0].clientY + event.touches[1].clientY) / 2;
      changeZoomRef.current(touchPinchRef.current.zoom * distance(event.touches) / Math.max(1, touchPinchRef.current.distance), focusX, focusY);
    };
    const end = (event: TouchEvent) => { if (event.touches.length < 2) touchPinchRef.current = null; if (event.touches.length === 0) touchPanRef.current = null; };
    stage.addEventListener("touchstart", start, { passive: true });
    stage.addEventListener("touchmove", move, { passive: false });
    stage.addEventListener("touchend", end);
    stage.addEventListener("touchcancel", end);
    return () => {
      stage.removeEventListener("touchstart", start);
      stage.removeEventListener("touchmove", move);
      stage.removeEventListener("touchend", end);
      stage.removeEventListener("touchcancel", end);
    };
  }, [readerMode]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes((event.target as HTMLElement)?.tagName)) return;
      if (event.key === "ArrowLeft") readingDirection === "rtl" ? next() : previous();
      if (event.key === "ArrowRight") readingDirection === "rtl" ? previous() : next();
      if (event.key === "+" || event.key === "=") changeZoom(zoom + 0.1);
      if (event.key === "-") changeZoom(zoom - 0.1);
      if (event.key === "0") changeZoom(1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [changeZoom, next, previous, readingDirection, zoom]);

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
    if (readerMode === "continuous" && event.pointerType === "touch") return;
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
        didSwipeRef.current = true;
        if (deltaX < 0) readingDirection === "rtl" ? previous() : next();
        else readingDirection === "rtl" ? next() : previous();
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
              <button onClick={() => setReaderMode("spread")} className={readerMode === "spread" ? "active" : ""} title="Páginas duplas como livro"><BookOpen /> Dupla</button>
            </div>
          </div>
          <div className="reader-setting-row reader-mode-row"><span>Leitura</span><div className="reader-mode-options direction-options"><button className={readingDirection === "ltr" ? "active" : ""} onClick={() => setReadingDirection("ltr")}>Ocidental →</button><button className={readingDirection === "rtl" ? "active" : ""} onClick={() => setReadingDirection("rtl")}>← Mangá</button></div></div>
          {offlineStorage && <div className="reader-setting-row reader-mode-row"><span>Offline</span><div className="flex flex-wrap items-center gap-2 text-xs"><span>{offlineStorage.megabytes.toFixed(1)} MB usados</span><button onClick={async () => { if (!window.confirm("Remover todas as edições offline deste dispositivo?")) return; await clearOffline(offlineStorage.userId); setOfflineStorage({ ...offlineStorage, megabytes: 0 }); }}><Trash2 className="w-4 h-4 inline mr-1" /> Liberar espaço offline</button></div></div>}
        </aside>
      )}

      <main
        ref={stageRef}
        className={`reader-stage texture-${texture} mode-${readerMode} ${zoom > 1.05 ? "reader-stage-zoomed" : ""}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={(event) => {
          if (didSwipeRef.current) { didSwipeRef.current = false; return; }
          if (readerMode === "continuous" || zoom > 1.05 || event.detail === 0) return;
          const rect = event.currentTarget.getBoundingClientRect();
          const ratio = (event.clientX - rect.left) / rect.width;
          if (ratio < .24) readingDirection === "rtl" ? next() : previous();
          if (ratio > .76) readingDirection === "rtl" ? previous() : next();
        }}
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
                width={Math.max(1, Math.min(920, stageSize.width - 12)) * zoom}
                brightness={brightness}
                onVisible={setCurrentPage}
              />
            ))}
          </div>
        ) : (
          <div key={`${currentPage}-${readerMode}`} className={`reader-page ${readerMode === "spread" ? "reader-spread" : ""} turn-${turnDirection}`} dir={readingDirection} style={{ filter: `brightness(${brightness}%)` }}>
            <canvas ref={canvasRef} />
            {readerMode === "spread" && currentPage > 1 && currentPage + 1 <= totalPages && <canvas ref={secondCanvasRef} />}
            <div className="reader-paper-grain" />
          </div>
        )}
        {isRendering && readerMode !== "continuous" && <div className="reader-loading"><span /></div>}
        {error && <div className="reader-error">{error}</div>}
      </main>

      <footer className="reader-dock">
        <button onClick={readingDirection === "rtl" ? next : previous} disabled={readingDirection === "rtl" ? currentPage >= totalPages || (readerMode === "spread" && currentPage > 1 && currentPage + 1 >= totalPages) : currentPage <= 1} aria-label={readingDirection === "rtl" ? "Próxima página" : "Página anterior"}><ChevronLeft /></button>
        <div className="reader-page-control">
          <input
            type="range"
            min="1"
            max={totalPages}
            value={currentPage}
            onChange={(event) => { const page = Number(event.target.value); setCurrentPage(readerMode === "spread" && page > 1 && page % 2 === 1 ? page - 1 : page); }}
            aria-label="Progresso da leitura"
          />
          <span>{currentPage} <small>/ {totalPages}</small></span>
        </div>
        <button onClick={readingDirection === "rtl" ? previous : next} disabled={readingDirection === "rtl" ? currentPage <= 1 : currentPage >= totalPages || (readerMode === "spread" && currentPage > 1 && currentPage + 1 >= totalPages)} aria-label={readingDirection === "rtl" ? "Página anterior" : "Próxima página"}><ChevronRight /></button>
        <div className="reader-zoom">
          <button onClick={() => changeZoom(zoom - 0.1)} aria-label="Reduzir zoom"><Minus /></button>
          <button onClick={() => changeZoom(1)} className="reader-reset-zoom" aria-label="Redefinir zoom para 100%"><RotateCcw /><span>{Math.round(zoom * 100)}%</span></button>
          <button onClick={() => changeZoom(zoom + 0.1)} aria-label="Aumentar zoom"><Plus /></button>
        </div>
      </footer>
    </div>
  );
};
