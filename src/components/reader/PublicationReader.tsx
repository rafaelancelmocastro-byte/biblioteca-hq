import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Rows3, Square } from "lucide-react";
import type { Comic } from "../../types/comic";
import { openPublicationBook, type PublicationBook } from "../../services/publicationBooks";
import { publicationFormat } from "../../services/publicationFormats";
import { downloadComicBlob } from "../../services/comicDownload";

type FoliateView = HTMLElement & {
  book: PublicationBook;
  renderer: HTMLElement;
  open: (book: PublicationBook) => Promise<void>;
  goTo: (target: number | { fraction: number }) => Promise<unknown>;
  next: () => Promise<void>;
  prev: () => Promise<void>;
  close: () => void;
};

export const PublicationReader: React.FC<{
  comic: Comic;
  fileUrl?: string;
  fileData?: Uint8Array;
  onBack: () => void;
  onNextChapter?: () => void;
  onUpdateProgress: (id: string, section: number, total: number) => void;
}> = ({ comic, fileUrl, fileData, onBack, onNextChapter, onUpdateProgress }) => {
  const holderRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<FoliateView | null>(null);
  const progressRef = useRef(onUpdateProgress);
  progressRef.current = onUpdateProgress;
  const [section, setSection] = useState(Math.max(1, comic.progress?.currentPage || 1));
  const [total, setTotal] = useState(Math.max(1, comic.totalPages));
  const [scrolled, setScrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const format = publicationFormat(comic.fileName);
  const isBook = format === "epub" || format === "azw3";
  const preferredDirection = (() => { const pref = localStorage.getItem("biblioteca_reading_direction"); return pref === "ltr" || pref === "rtl" ? pref : comic.readingDirection || "ltr"; })();

  useEffect(() => {
    let active = true;
    let view: FoliateView | null = null;
    let book: PublicationBook | null = null;
    const open = async () => {
      if (!holderRef.current) return;
      setLoading(true);
      const blob = fileData ? new Blob([new Uint8Array(fileData)]) : await downloadComicBlob(comic.id, fileUrl!);
      const file = new File([blob], comic.fileName);
      book = await openPublicationBook(file);
      if (!active) { book.destroy?.(); return; }
      if (format === "cbr") book.dir = preferredDirection;
      await import("foliate-js/view.js");
      view = document.createElement("foliate-view") as FoliateView;
      view.className = "publication-view";
      holderRef.current?.append(view);
      viewRef.current = view;
      await view.open(book);
      view.renderer.addEventListener("relocate", (event) => {
        const detail = (event as CustomEvent<{ index?: number }>).detail;
        const location = (view as FoliateView & { lastLocation?: { fraction?: number } }).lastLocation;
        const fraction = location?.fraction;
        const current = isBook && Number.isFinite(fraction) ? Math.max(1, Math.min(100, Math.round(fraction! * 100))) : (detail.index ?? 0) + 1;
        const count = isBook ? 100 : book!.sections.length;
        setSection(current); setTotal(count);
        progressRef.current(comic.id, current, count);
      });
      if (!active) return;
      setTotal(isBook ? 100 : book.sections.length);
      await Promise.race([
        view.goTo(isBook ? { fraction: Math.max(0, ((comic.progress?.currentPage || 1) - 1) / 100) } : Math.min(book.sections.length, Math.max(1, comic.progress?.currentPage || 1)) - 1),
        new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error("A página demorou para abrir. Tente novamente ou verifique se o arquivo está íntegro.")), 20_000)),
      ]);
      setLoading(false);
    };
    void open().catch((cause) => { if (active) { setError(cause instanceof Error ? cause.message : "Não foi possível abrir este arquivo."); setLoading(false); } });
    return () => { active = false; view?.close(); view?.remove(); book?.destroy?.(); viewRef.current = null; };
  }, [comic.id, comic.fileName, fileUrl, fileData, format, preferredDirection]);

  useEffect(() => {
    const view = viewRef.current;
    if (view && isBook) view.renderer?.setAttribute("flow", scrolled ? "scrolled" : "paginated");
  }, [isBook, scrolled, loading]);

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") { event.preventDefault(); void (preferredDirection === "rtl" ? viewRef.current?.next() : viewRef.current?.prev()); }
      if (event.key === "ArrowRight") { event.preventDefault(); void (preferredDirection === "rtl" ? viewRef.current?.prev() : viewRef.current?.next()); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [preferredDirection]);

  return <div className="reader-shell publication-shell fixed inset-0 z-50 flex flex-col text-[#e9edf2]">
    <header className="reader-topbar"><button className="reader-icon-button" onClick={onBack} aria-label="Voltar para a biblioteca"><ArrowLeft /></button><div className="min-w-0 flex-1"><strong className="block truncate">{comic.title}</strong><small className="text-white/60">{format?.toUpperCase()} · {comic.publisher}</small></div>{isBook && <button className="publication-mode" onClick={() => setScrolled((value) => !value)}>{scrolled ? <><Square /> Páginas</> : <><Rows3 /> Rolagem</>}</button>}</header>
    <main className="publication-stage" ref={holderRef} aria-label={`Leitor de ${comic.title}`}>
      {loading && <p className="publication-message">Preparando {format?.toUpperCase()}...</p>}
      {error && <div role="alert" className="publication-message"><p>{error}</p><button onClick={onBack}>Voltar ao acervo</button></div>}
    </main>
    {onNextChapter && section >= total && <button className="reader-next-chapter" onClick={onNextChapter}>Ler o próximo capítulo <ChevronRight /></button>}
    <footer className="reader-dock publication-dock"><button onClick={() => void (preferredDirection === "rtl" ? viewRef.current?.next() : viewRef.current?.prev())} aria-label="Página anterior"><ChevronLeft /></button><label className="reader-page-control"><input type="range" min="1" max={total} value={section} onChange={(event) => void viewRef.current?.goTo(isBook ? { fraction: Number(event.target.value) / 100 } : Number(event.target.value) - 1)} aria-label="Progresso da leitura" /><span>{isBook ? `${section}%` : `Página ${section} / ${total}`}</span></label><button onClick={() => void (preferredDirection === "rtl" ? viewRef.current?.prev() : viewRef.current?.next())} aria-label="Próxima página"><ChevronRight /></button></footer>
  </div>;
};
