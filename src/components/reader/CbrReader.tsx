import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight, Expand, GalleryHorizontal, Minimize, Minus, Plus, RotateCcw, Rows3, Settings2, Square, SunMedium } from "lucide-react";
import type { Comic } from "../../types/comic";
import { openPublicationBook, type PublicationBook } from "../../services/publicationBooks";

type Mode = "continuous" | "page" | "horizontal" | "spread";
type Texture = "clean" | "paper" | "warm";

function CbrImage({ book, index, className = "", onVisible }: { book: PublicationBook; index: number; className?: string; onVisible?: (page: number) => void }) {
  const holder = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState("");
  const [height, setHeight] = useState(0);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const element = holder.current;
    if (!element || !book.getPageBlob) return;
    let active = true;
    let currentUrl = "";
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        if (!currentUrl && !failed) void book.getPageBlob!(index).then((blob) => {
          if (!active) return;
          currentUrl = URL.createObjectURL(blob);
          setUrl(currentUrl);
        }).catch(() => { if (active) setFailed(true); });
      } else if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
        currentUrl = "";
        setUrl("");
      }
    }, { root: element.closest(".cbr-scroll-stage"), rootMargin: "800px 0px" });
    observer.observe(element);
    const visibility = onVisible ? new IntersectionObserver(([entry]) => { if (entry.isIntersecting && entry.intersectionRatio > .15) onVisible(index + 1); }, { root: element.closest(".cbr-scroll-stage"), threshold: [.15, .4] }) : null;
    visibility?.observe(element);
    return () => { active = false; observer.disconnect(); visibility?.disconnect(); if (currentUrl) URL.revokeObjectURL(currentUrl); };
  }, [book, index, onVisible, failed]);
  return <div ref={holder} data-cbr-page={index + 1} className={`cbr-image-holder ${className}`} style={height ? { minHeight: height } : undefined}>
    {url && !failed ? <img src={url} alt={`Página ${index + 1}`} onLoad={(event) => setHeight(event.currentTarget.getBoundingClientRect().height)} onError={() => setFailed(true)} /> : <span>{failed ? `Não foi possível abrir a página ${index + 1}.` : `Carregando página ${index + 1}…`}</span>}
  </div>;
}

export function CbrReader({ comic, fileUrl, fileData, onBack, onNextChapter, onUpdateProgress }: {
  comic: Comic; fileUrl?: string; fileData?: Uint8Array; onBack: () => void;
  onNextChapter?: () => void; onUpdateProgress: (id: string, page: number, total: number) => void;
}) {
  const [book, setBook] = useState<PublicationBook | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(Math.max(1, comic.progress?.currentPage || 1));
  const [mode, setMode] = useState<Mode>(() => (localStorage.getItem("biblioteca_reader_mode") as Mode) || "page");
  const [direction, setDirection] = useState<"ltr" | "rtl">(comic.readingDirection || "ltr");
  const [zoom, setZoom] = useState(1);
  const [brightness, setBrightness] = useState(100);
  const [texture, setTexture] = useState<Texture>("clean");
  const [settings, setSettings] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const stageRef = useRef<HTMLElement>(null);
  const lastWheelTurn = useRef(0);
  const shellRef = useRef<HTMLDivElement>(null);
  const startTouch = useRef<{ x: number; y: number; distance?: number; zoom?: number } | null>(null);
  const total = book?.sections.length || comic.totalPages;
  const visiblePage = mode === "spread" && page > 1 && page % 2 === 1 ? page - 1 : page;
  const setCurrent = useCallback((target: number) => setPage(Math.max(1, Math.min(total, target))), [total]);
  const previous = useCallback(() => setCurrent(visiblePage - (mode === "spread" && visiblePage > 2 ? 2 : 1)), [mode, setCurrent, visiblePage]);
  const next = useCallback(() => setCurrent(visiblePage + (mode === "spread" && visiblePage > 1 ? 2 : 1)), [mode, setCurrent, visiblePage]);
  const progress = useCallback((current: number) => { setPage(current); onUpdateProgress(comic.id, current, total); }, [comic.id, onUpdateProgress, total]);

  useEffect(() => {
    let active = true;
    let opened: PublicationBook | null = null;
    setBook(null);
    setError("");
    void (async () => {
      const response = fileData ? null : await fetch(fileUrl!, { cache: "no-store" });
      if (response && !response.ok) throw new Error("Não foi possível baixar o CBR.");
      const blob = fileData ? new Blob([new Uint8Array(fileData)]) : await response!.blob();
      opened = await openPublicationBook(new File([blob], comic.fileName));
      if (active) { setBook(opened); setPage((current) => Math.min(current, opened!.sections.length)); }
      else opened.destroy?.();
    })().catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Não foi possível abrir o CBR."); });
    return () => { active = false; opened?.destroy?.(); };
  }, [comic.fileName, fileData, fileUrl]);
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
  useEffect(() => { if (mode === "continuous") stageRef.current?.querySelector(`[data-cbr-page="${page}"]`)?.scrollIntoView({ block: "start" }); }, [mode]);
  const changeMode = (value: Mode) => { setMode(value); if (value === "spread" && page > 1 && page % 2 === 1) setPage(page - 1); };
  const toggleFullscreen = () => { if (document.fullscreenElement) void document.exitFullscreen(); else void shellRef.current?.requestFullscreen(); };
  const shown = mode === "spread" && visiblePage > 1 && visiblePage < total ? [visiblePage - 1, visiblePage] : [visiblePage - 1];

  return <div ref={shellRef} className="reader-shell fixed inset-0 z-50 flex flex-col text-[#e9edf2]">
    <header className="reader-topbar"><button className="reader-icon-button" onClick={onBack} aria-label="Voltar"><ArrowLeft /></button><div className="min-w-0 flex-1"><strong className="block truncate">{comic.title}</strong><small className="text-white/60">{comic.seriesTitle} · {comic.publisher}</small></div><button className="reader-icon-button" onClick={() => setSettings((value) => !value)} aria-label="Ajustes de leitura"><Settings2 /></button><button className="reader-icon-button" onClick={toggleFullscreen} aria-label="Alternar tela cheia">{fullscreen ? <Minimize /> : <Expand />}</button></header>
    {settings && <aside className="reader-settings" aria-label="Preferências de leitura">
      <label className="reader-setting-row"><span><SunMedium /> Brilho</span><input type="range" min="55" max="125" value={brightness} onChange={(event) => setBrightness(Number(event.target.value))} /><strong>{brightness}%</strong></label>
      <div className="reader-setting-row"><span>Textura</span><div className="flex gap-1.5">{(["clean", "paper", "warm"] as Texture[]).map((value) => <button key={value} className={texture === value ? "active" : ""} onClick={() => setTexture(value)}>{value === "clean" ? "Limpa" : value === "paper" ? "Papel" : "Quente"}</button>)}</div></div>
      <div className="reader-setting-row reader-mode-row"><span>Modo</span><div className="reader-mode-options"><button className={mode === "continuous" ? "active" : ""} onClick={() => changeMode("continuous")}><Rows3 /> Vertical</button><button className={mode === "page" ? "active" : ""} onClick={() => changeMode("page")}><Square /> Página vertical</button><button className={mode === "horizontal" ? "active" : ""} onClick={() => changeMode("horizontal")}><GalleryHorizontal /> Horizontal</button><button className={mode === "spread" ? "active" : ""} onClick={() => changeMode("spread")}><BookOpen /> Dupla</button></div></div>
      <div className="reader-setting-row reader-mode-row"><span>Leitura</span><div className="reader-mode-options direction-options"><button className={direction === "ltr" ? "active" : ""} onClick={() => setDirection("ltr")}>Ocidental →</button><button className={direction === "rtl" ? "active" : ""} onClick={() => setDirection("rtl")}>← Mangá</button></div></div>
    </aside>}
    <main ref={stageRef} className={`reader-stage cbr-scroll-stage texture-${texture} mode-${mode} ${zoom > 1.05 ? "reader-stage-zoomed" : ""}`} style={{ filter: `brightness(${brightness}%)` }}
      onTouchStart={(event) => { const touches = event.touches; startTouch.current = touches.length === 2 ? { x: 0, y: 0, distance: Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY), zoom } : { x: touches[0].clientX, y: touches[0].clientY }; }}
      onTouchMove={(event) => { if (event.touches.length === 2 && startTouch.current?.distance) { const distance = Math.hypot(event.touches[0].clientX - event.touches[1].clientX, event.touches[0].clientY - event.touches[1].clientY); setZoom(Math.min(3, Math.max(.7, startTouch.current.zoom! * distance / startTouch.current.distance))); } }}
      onTouchEnd={(event) => { if (mode === "continuous" || zoom > 1.05 || !startTouch.current || startTouch.current.distance || !event.changedTouches.length) return; const dx = event.changedTouches[0].clientX - startTouch.current.x, dy = event.changedTouches[0].clientY - startTouch.current.y; if (mode === "page" && Math.abs(dy) > 55 && Math.abs(dy) > Math.abs(dx)) dy < 0 ? next() : previous(); else if (mode !== "page" && Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) dx < 0 ? (direction === "rtl" ? previous() : next()) : (direction === "rtl" ? next() : previous()); }}
      onWheel={(event) => { if (mode === "continuous" || zoom > 1.05 || Date.now() - lastWheelTurn.current < 420) return; if (mode === "page" && Math.abs(event.deltaY) > 30) { lastWheelTurn.current = Date.now(); event.preventDefault(); event.deltaY > 0 ? next() : previous(); } else if (mode !== "page" && Math.abs(event.deltaX) > 30) { lastWheelTurn.current = Date.now(); event.preventDefault(); event.deltaX > 0 ? next() : previous(); } }}>
      {!book ? <div className="reader-loading" role="status">{error || "Preparando CBR..."}</div> : mode === "continuous" ? <div className="cbr-continuous" style={{ width: `${Math.round(zoom * 100)}%`, maxWidth: `${56 * zoom}rem` }}>{book.sections.map((_, index) => <CbrImage key={index} book={book} index={index} onVisible={progress} />)}</div> : <div className={`cbr-page ${mode === "spread" ? "cbr-spread" : ""}`} style={{ width: `${Math.round(zoom * 100)}%` }}>{shown.map((index) => <CbrImage key={index} book={book} index={index} />)}</div>}
      {book && page >= total && onNextChapter && <button className="reader-next-chapter" onClick={onNextChapter}>Ler o próximo capítulo <ChevronRight /></button>}
    </main>
    <footer className="reader-dock"><button onClick={direction === "rtl" ? next : previous} disabled={direction === "rtl" ? page >= total : page <= 1} aria-label={direction === "rtl" ? "Próxima página" : "Página anterior"}><ChevronLeft /></button><div className="reader-page-control"><input type="range" min="1" max={total} value={page} onChange={(event) => { const target = Number(event.target.value); setCurrent(target); if (mode === "continuous") stageRef.current?.querySelector(`[data-cbr-page="${target}"]`)?.scrollIntoView({ block: "start" }); }} aria-label="Progresso da leitura" /><span>{page} <small>/ {total}</small></span></div><button onClick={direction === "rtl" ? previous : next} disabled={direction === "rtl" ? page <= 1 : page >= total} aria-label={direction === "rtl" ? "Página anterior" : "Próxima página"}><ChevronRight /></button><div className="reader-zoom"><button onClick={() => setZoom((value) => Math.max(.7, value - .1))} aria-label="Reduzir zoom"><Minus /></button><button className="reader-reset-zoom" onClick={() => setZoom(1)} aria-label="Redefinir zoom"><RotateCcw /><span>{Math.round(zoom * 100)}%</span></button><button onClick={() => setZoom((value) => Math.min(3, value + .1))} aria-label="Aumentar zoom"><Plus /></button></div></footer>
  </div>;
}
