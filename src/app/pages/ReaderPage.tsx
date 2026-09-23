import React, { useState, useEffect } from "react";
import { Comic } from "../../types/comic";
import { getSupabaseCatalog, getSupabaseComicById } from "../../services/supabaseCatalogRepository";
import { getComicReadUrl } from "../../services/comicRead";
import { ComicReader } from "../../components/reader/ComicReader";
import { PublicationReader } from "../../components/reader/PublicationReader";
import { CbrReader } from "../../components/reader/CbrReader";
import { publicationFormat } from "../../services/publicationFormats";
import { getQueuedProgress, saveReadingProgress } from "../../services/offlineProgress";
import { Button } from "../../components/ui/Button";
import { ArrowLeft, BookX } from "lucide-react";
import { listOffline, readOffline } from "../../services/offlineLibrary";
import { supabase } from "../../services/supabaseClient";

interface ReaderPageProps {
  comicId: string;
  onBack: () => void;
  onOpenReader: (id: string) => void;
}

export const ReaderPage: React.FC<ReaderPageProps> = ({ comicId, onBack, onOpenReader }) => {
  const [comic, setComic] = useState<Comic | null>(null);
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfData, setPdfData] = useState<Uint8Array | undefined>();
  const [userId, setUserId] = useState("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [nextComic, setNextComic] = useState<Comic | null>(null);

  useEffect(() => {
    let active = true;
    const findNext = async () => {
      let comics: Comic[] = [];
      if (navigator.onLine) {
        try { comics = (await getSupabaseCatalog()).comics; } catch { /* Offline copies may still be available. */ }
      }
      if (!comics.length) {
        const session = (await supabase?.auth.getSession())?.data.session;
        if (session) comics = (await listOffline(session.user.id)).map((item) => item.comic);
      }
      const current = comics.find((item) => item.id === comicId);
      if (!current || !active) return;
      const ordered = comics.filter((item) => item.seriesId === current.seriesId)
        .sort((a, b) => (a.volume || 0) - (b.volume || 0) || a.issueNumber - b.issueNumber || a.year - b.year);
      setNextComic(ordered[ordered.findIndex((item) => item.id === comicId) + 1] || null);
    };
    setNextComic(null);
    void findNext();
    return () => { active = false; };
  }, [comicId]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    (async () => {
      const { data: auth } = await supabase!.auth.getSession();
      if (isMounted) setUserId(auth.session?.user.id || "");
      if (navigator.onLine) {
        try {
          const [data, url] = await Promise.all([getSupabaseComicById(comicId), getComicReadUrl(comicId)]);
          if (data && isMounted) { setComic(data); setPdfUrl(url); setIsLoading(false); return; }
        } catch { /* Use uma cópia offline quando a rede falhar. */ }
      }
      const offline = auth.session ? await readOffline(auth.session.user.id, comicId) : null;
      if (offline && isMounted) { const queued = getQueuedProgress(auth.session!.user.id, comicId); setComic(queued ? { ...offline.comic, progress: { comicId, currentPage: queued.page, totalPages: queued.total, percentage: Math.round(queued.page / queued.total * 100), status: queued.page >= queued.total ? "completed" : "reading", lastReadAt: queued.updatedAt, updatedAt: queued.updatedAt } } : offline.comic); setPdfData(offline.data); setIsLoading(false); return; }
      if (isMounted) setIsLoading(false);
    })()
      .catch(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [comicId]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-[#080a0f] flex flex-col items-center justify-center z-50">
        <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-mono text-slate-400">Carregando edição e preparando páginas...</p>
      </div>
    );
  }

  if (!comic || (!pdfUrl && !pdfData)) {
    return (
      <div className="fixed inset-0 bg-[#080a0f] flex flex-col items-center justify-center p-6 text-center z-50">
        <BookX className="w-12 h-12 text-slate-600 mb-3" />
        <h2 className="text-base font-bold text-white mb-1">HQ não encontrada</h2>
        <p className="text-xs text-slate-400 mb-6 max-w-sm">
          A edição solicitada não existe ou foi removida do catálogo da biblioteca.
        </p>
        <Button variant="primary" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para a Biblioteca
        </Button>
      </div>
    );
  }

  if (publicationFormat(comic.fileName) === "cbr") return <CbrReader comic={comic} fileUrl={pdfUrl} fileData={pdfData} onBack={onBack} onNextChapter={nextComic ? () => onOpenReader(nextComic.id) : undefined} onUpdateProgress={(id, page, total) => { void saveReadingProgress(userId, id, page, total); }} />;
  if (publicationFormat(comic.fileName) && publicationFormat(comic.fileName) !== "pdf") return <PublicationReader comic={comic} fileUrl={pdfUrl} fileData={pdfData} onBack={onBack} onNextChapter={nextComic ? () => onOpenReader(nextComic.id) : undefined} onUpdateProgress={(id, page, total) => { void saveReadingProgress(userId, id, page, total); }} />;

  return (
    <ComicReader
      comic={comic}
      pdfUrl={pdfUrl}
      pdfData={pdfData}
      onBack={onBack}
      onNextChapter={nextComic ? () => onOpenReader(nextComic.id) : undefined}
      onUpdateProgress={(id, page, total) => { void saveReadingProgress(userId, id, page, total); }}
    />
  );
};
