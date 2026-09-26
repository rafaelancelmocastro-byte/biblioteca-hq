import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Expand, Minimize, Settings2 } from "lucide-react";
import type { Comic } from "../../types/comic";
import { openPublicationBook, type PublicationBook } from "../../services/publicationBooks";
import { createRemoteArchiveSource, downloadComicBlob } from "../../services/comicDownload";
import { publicationFormat } from "../../services/publicationFormats";
import { ReaderCompletion, ReaderDock, ReaderSettings, useReaderChrome, type NextIssue, type ReaderFit, type ReaderMode, type ReaderTexture } from "./ReaderChrome";
import { saveCurrentUserPreferencePatch } from "../../services/userPreferences";

function CbrImage({ book, index, className = "", onVisible }: { book: PublicationBook; index: number; className?: string; onVisible?: (page: number) => void }) {
  const holder = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState("");
  const [height, setHeight] = useState(0);
  const [failed, setFailed] = useState("");
  const [near, setNear] = useState(false);
  useEffect(() => {
    const element = holder.current;
    if (!element || !book.getPageBlob) return;
    let active = true;
    let currentUrl = "";
    const observer = new IntersectionObserver(([entry]) => {
      setNear(entry.isIntersecting);
      if (entry.isIntersecting) {
        if (!currentUrl && !failed) void book.getPageBlob!(index).then((blob) => {
          if (!active) return;
          currentUrl = URL.createObjectURL(blob);
          setUrl(currentUrl);
        }).catch((cause) => { if (active) setFailed(cause instanceof Error ? cause.message : "Erro ao extrair imagem"); });
      } else if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
        currentUrl = "";
        setUrl("");
      }
    }, { root: element.closest(".cbr-scroll-stage"), rootMargin: "350px 0px" });
    observer.observe(element);
    const visibility = onVisible ? new IntersectionObserver(([entry]) => { if (entry.isIntersecting && entry.intersectionRatio > .15) onVisible(index + 1); }, { root: element.closest(".cbr-scroll-stage"), threshold: [.15, .4] }) : null;
    visibility?.observe(element);
    return () => { active = false; observer.disconnect(); visibility?.disconnect(); if (currentUrl) URL.revokeObjectURL(currentUrl); };
  }, [book, index, onVisible, failed]);
  return <div ref={holder} data-cbr-page={index + 1} className={`cbr-image-holder ${className}`} style={height ? { minHeight: height } : undefined}>
    {url && !failed ? <img src={url} alt={`Página ${index + 1}`} onLoad={(event) => setHeight(event.currentTarget.getBoundingClientRect().height)} onError={() => setFailed("Imagem inválida")} /> : near || failed ? <span>{failed ? `Não foi possível abrir a página ${index + 1}: ${failed}` : `Carregando página ${index + 1}…`}</span> : null}
  </div>;
}

export function CbrReader({ comic, fileUrl, fileData, onBack, onNextChapter, nextIssue, onUpdateProgress }: {
  comic: Comic; fileUrl?: string; fileData?: Uint8Array; onBack: () => void;
  onNextChapter?: () => void; nextIssue?: NextIssue | null; onUpdateProgress: (id: string, page: number, total: number) => void;
}) {
  const [book, setBook] = useState<PublicationBook | null>(null);
  const [previewBook, setPreviewBook] = useState<PublicationBook | null>(null);
  const [error, setError] = useState("");
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [page, setPage] = useState(Math.max(1, comic.progress?.currentPage || 1));
  const resumePageRef = useRef(Math.max(1, comic.progress?.currentPage || 1));
  const restoringPositionRef = useRef(resumePageRef.current > 1);
  const [mode, setMode] = useState<ReaderMode>(() => (localStorage.getItem("biblioteca_reader_mode") as ReaderMode) || "page");
  const [direction, setDirection] = useState<"ltr" | "rtl">(() => { const pref = localStorage.getItem("biblioteca_reading_direction"); return pref === "ltr" || pref === "rtl" ? pref : comic.readingDirection || "ltr"; });
  const [zoom, setZoom] = useState(1);
  const [brightness, setBrightness] = useState(100);
  const [texture, setTexture] = useState<ReaderTexture>("clean");
  const [fitMode, setFitMode] = useState<ReaderFit>(() => (localStorage.getItem("biblioteca_reader_fit") as ReaderFit) || "height");
  const [settings, setSettings] = useState(false);
  const { controlsVisible, showControls, toggleControls } = useReaderChrome(settings);
  const [fullscreen, setFullscreen] = useState(false);
  const stageRef = useRef<HTMLElement>(null);
  const lastWheelTurn = useRef(0);
  const shellRef = useRef<HTMLDivElement>(null);
  const startTouch = useRef<{ x: number; y: number; distance?: number; zoom?: number } | null>(null);
  const didSwipe = useRef(false);
  const activeBook = book || previewBook;
  const previewOnly = !book && !!previewBook;
  const total = book?.sections.length || comic.totalPages;
  const displayedPage = previewOnly && page > previewBook.sections.length ? 1 : page;
  const visiblePage = mode === "spread" && displayedPage > 1 && displayedPage % 2 === 1 ? displayedPage - 1 : displayedPage;
  const setCurrent = useCallback((target: number) => setPage(Math.max(1, Math.min(book?.sections.length || previewBook?.sections.length || total, target))), [book, previewBook, total]);
  const previous = useCallback(() => setCurrent(visiblePage - (mode === "spread" && visiblePage > 2 ? 2 : 1)), [mode, setCurrent, visiblePage]);
  const next = useCallback(() => setCurrent(visiblePage + (mode === "spread" && visiblePage > 1 ? 2 : 1)), [mode, setCurrent, visiblePage]);
  const progress = useCallback((current: number) => { setPage(current); onUpdateProgress(comic.id, current, total); }, [comic.id, onUpdateProgress, total]);

  useEffect(() => {
    let active = true;
    let opened: PublicationBook | null = null;
    let preview: PublicationBook | null = null;
    setBook(null);
    setPreviewBook(null);
    setError("");
    setDownloadProgress(0);
    void (async () => {
      if (!fileData && fileUrl && ["cbr", "cbz"].includes(publicationFormat(comic.fileName) || "")) {
        try {
          const source = await createRemoteArchiveSource(comic.id, fileUrl);
          if (publicationFormat(comic.fileName) === "cbr") {
            const length = await source.getLength();
            for (const size of [4, 8].map((megabytes) => Math.min(length, megabytes * 1024 * 1024))) {
              try {
                const prefix = await source.read(0, size);
                preview = await openPublicationBook(new File([new Uint8Array(prefix)], comic.fileName));
                if (!preview.sections.length || !preview.getPageBlob) throw new Error("Prévia vazia.");
                await preview.getPageBlob(0);
                if (active) setPreviewBook(preview);
                break;
              } catch { preview?.destroy?.(); preview = null; }
            }
          }
          opened = await openPublicationBook(new File([], comic.fileName), source);
          if (active) { setBook(opened); setPreviewBook(null); setPage((current) => Math.min(current, opened!.sections.length)); window.setTimeout(() => preview?.destroy?.(), 1000); }
          else opened.destroy?.();
          return;
        } catch { /* Fall back to downloading the archive in chunks. */ }
      }
      const blob = fileData ? new Blob([new Uint8Array(fileData)]) : await downloadComicBlob(comic.id, fileUrl!, (received, total) => { if (active) setDownloadProgress(Math.min(100, Math.round(received / total * 100))); });
      opened = await openPublicationBook(new File([blob], comic.fileName));
      if (active) { setBook(opened); setPage((current) => Math.min(current, opened!.sections.length)); }
      else opened.destroy?.();
    })().catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Não foi possível abrir a HQ."); });
    return () => { active = false; opened?.destroy?.(); preview?.destroy?.(); };
  }, [comic.id, comic.fileName, fileData, fileUrl]);
  useEffect(() => { localStorage.setItem("biblioteca_reader_mode", mode); }, [mode]);
  useEffect(() => { if (book) onUpdateProgress(comic.id, page, total); }, [book, comic.id, page, total, onUpdateProgress]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown" && mode === "page") { event.preventDefault(); next(); }
      if (event.key === "ArrowUp" && mode === "page") { event.preventDefault(); previous(); }
      if (event.key === "ArrowRight") { event.preventDefault(); direction === "rtl" ? previous() : next(); }
      if (event.key === "ArrowLeft") { event.preventDefault(); direction === "rtl" ? next() : previous(); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [direction, mode, next, previous]);
  useEffect(() => { const handler = () => setFullscreen(!!document.fullscreenElement); document.addEventListener("fullscreenchange", handler); return () => document.removeEventListener("fullscreenchange", handler); }, []);
  useEffect(() => {
    if (mode !== "continuous" || !book) return;
    const frame = requestAnimationFrame(() => stageRef.current?.querySelector(`[data-cbr-page="${Math.min(resumePageRef.current, book.sections.length)}"]`)?.scrollIntoView({ block: "start" }));
    const timer = window.setTimeout(() => { restoringPositionRef.current = false; }, 400);
    return () => { cancelAnimationFrame(frame); window.clearTimeout(timer); };
  }, [book, mode]);
  const changeMode = (value: ReaderMode) => { setMode(value); localStorage.setItem("biblioteca_reader_mode", value); void saveCurrentUserPreferencePatch({ readerMode: value }); if (value === "spread" && page > 1 && page % 2 === 1) setPage(page - 1); };
  const toggleFullscreen = () => { if (document.fullscreenElement) void document.exitFullscreen(); else void shellRef.current?.requestFullscreen(); };
  const shown = mode === "spread" && visiblePage > 1 && visiblePage < total ? [visiblePage - 1, visiblePage] : [visiblePage - 1];

  return <div ref={shellRef} className={`reader-shell reader-immersive fixed inset-0 z-50 flex flex-col text-[#e9edf2] ${controlsVisible ? "" : "reader-controls-hidden"}`} onPointerDownCapture={(event) => { if ((event.target as HTMLElement).closest(".reader-topbar,.reader-dock,.reader-settings")) showControls(); }}>
    <header className="reader-topbar"><button className="reader-icon-button" onClick={onBack} aria-label="Voltar"><ArrowLeft /></button><div className="min-w-0 flex-1"><strong className="block truncate">{comic.title}</strong><small className="text-white/60">{comic.seriesTitle} · {comic.publisher}</small></div><button className="reader-icon-button" onClick={() => { showControls(); setSettings((value) => !value); }} aria-label="Ajustes de leitura" aria-expanded={settings}><Settings2 /></button><button className="reader-icon-button" onClick={toggleFullscreen} aria-label="Alternar tela cheia">{fullscreen ? <Minimize /> : <Expand />}</button></header>
    {settings && <ReaderSettings mode={mode} onModeChange={changeMode} direction={direction} onDirectionChange={(value) => { setDirection(value); localStorage.setItem("biblioteca_reading_direction", value); void saveCurrentUserPreferencePatch({ readingDirection: value }); }} brightness={brightness} onBrightnessChange={setBrightness} texture={texture} onTextureChange={setTexture} />}
    <main ref={stageRef} className={`reader-stage cbr-scroll-stage texture-${texture} mode-${mode} ${zoom > 1.05 ? "reader-stage-zoomed" : ""} ${fitMode === "width" ? "reader-stage-fit-width" : ""}`} style={{ filter: `brightness(${brightness}%)` }}
      onTouchStart={(event) => { didSwipe.current = false; const touches = event.touches; startTouch.current = touches.length === 2 ? { x: 0, y: 0, distance: Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY), zoom } : { x: touches[0].clientX, y: touches[0].clientY }; }}
      onTouchMove={(event) => { if (event.touches.length === 2 && startTouch.current?.distance) { const distance = Math.hypot(event.touches[0].clientX - event.touches[1].clientX, event.touches[0].clientY - event.touches[1].clientY); setZoom(Math.min(3, Math.max(.7, startTouch.current.zoom! * distance / startTouch.current.distance))); } }}
      onTouchEnd={(event) => { if (mode === "continuous" || zoom > 1.05 || !startTouch.current || startTouch.current.distance || !event.changedTouches.length) return; const dx = event.changedTouches[0].clientX - startTouch.current.x, dy = event.changedTouches[0].clientY - startTouch.current.y; if (mode === "page" && Math.abs(dy) > 55 && Math.abs(dy) > Math.abs(dx)) { didSwipe.current = true; dy < 0 ? next() : previous(); } else if (mode !== "page" && Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) { didSwipe.current = true; dx < 0 ? (direction === "rtl" ? previous() : next()) : (direction === "rtl" ? next() : previous()); } }}
      onClick={(event) => { if (didSwipe.current) { didSwipe.current = false; return; } if (event.detail === 0) return; const rect = event.currentTarget.getBoundingClientRect(); const x = (event.clientX - rect.left) / rect.width, y = (event.clientY - rect.top) / rect.height; if (x > .26 && x < .74 && y > .24 && y < .76) { setSettings(false); toggleControls(); } }}
      onWheel={(event) => { if (mode === "continuous" || zoom > 1.05 || Date.now() - lastWheelTurn.current < 420) return; if (mode === "page" && Math.abs(event.deltaY) > 30) { lastWheelTurn.current = Date.now(); event.preventDefault(); event.deltaY > 0 ? next() : previous(); } else if (mode !== "page" && Math.abs(event.deltaX) > 30) { lastWheelTurn.current = Date.now(); event.preventDefault(); event.deltaX > 0 ? next() : previous(); } }}>
      {!activeBook ? <div className="reader-loading" role="status">{error || (downloadProgress > 0 && downloadProgress < 100 ? `Carregando HQ… ${downloadProgress}%` : "Preparando HQ…")}</div> : mode === "continuous" ? <div className="cbr-continuous" style={{ width: `${Math.round(zoom * 100)}%`, maxWidth: `${56 * zoom}rem` }}>{activeBook.sections.map((_, index) => <CbrImage key={index} book={activeBook} index={index} onVisible={book ? (visiblePage) => { if (!restoringPositionRef.current) progress(visiblePage); } : undefined} />)}</div> : <div className={`cbr-page ${mode === "spread" && shown.filter((index) => index < activeBook.sections.length).length === 2 ? "cbr-spread" : ""}`} style={{ width: `${Math.round(zoom * 100)}%` }}>{shown.filter((index) => index < activeBook.sections.length).map((index) => <CbrImage key={index} book={activeBook} index={index} />)}</div>}
      {previewOnly && <div className="reader-preview-status" role="status">Primeiras páginas disponíveis · preparando o restante</div>}
    </main>
    {book && visiblePage + (mode === "spread" && visiblePage > 1 ? 1 : 0) >= total && <ReaderCompletion nextIssue={nextIssue} onNextChapter={onNextChapter} />}
    <ReaderDock page={displayedPage} total={total} onPageChange={(target) => { setCurrent(target); if (mode === "continuous") stageRef.current?.querySelector(`[data-cbr-page="${target}"]`)?.scrollIntoView({ block: "start" }); }} onPrevious={direction === "rtl" ? next : previous} onNext={direction === "rtl" ? previous : next} previousDisabled={direction === "rtl" ? displayedPage >= (activeBook?.sections.length || total) : displayedPage <= 1} nextDisabled={direction === "rtl" ? displayedPage <= 1 : displayedPage >= (activeBook?.sections.length || total)} zoom={zoom} onZoomChange={(value) => setZoom(Math.min(3, Math.max(.7, value)))} fit={fitMode} onFitChange={(fit) => { setFitMode(fit); localStorage.setItem("biblioteca_reader_fit", fit); void saveCurrentUserPreferencePatch({ readerFit: fit }); setZoom(1); if (fit === "height" && mode === "continuous") changeMode("page"); }} scrubDisabled={previewOnly} />
  </div>;
}
