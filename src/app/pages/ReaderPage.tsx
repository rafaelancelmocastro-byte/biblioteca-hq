import React, { useState, useEffect } from "react";
import { Comic } from "../../types/comic";
import { getSupabaseComicById } from "../../services/supabaseCatalogRepository";
import { getComicReadUrl } from "../../services/comicRead";
import { ComicReader } from "../../components/reader/ComicReader";
import { getQueuedProgress, saveReadingProgress } from "../../services/offlineProgress";
import { Button } from "../../components/ui/Button";
import { ArrowLeft, BookX } from "lucide-react";
import { readOffline } from "../../services/offlineLibrary";
import { supabase } from "../../services/supabaseClient";

interface ReaderPageProps {
  comicId: string;
  onBack: () => void;
}

export const ReaderPage: React.FC<ReaderPageProps> = ({ comicId, onBack }) => {
  const [comic, setComic] = useState<Comic | null>(null);
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfData, setPdfData] = useState<Uint8Array | undefined>();
  const [userId, setUserId] = useState("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

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

  return (
    <ComicReader
      comic={comic}
      pdfUrl={pdfUrl}
      pdfData={pdfData}
      onBack={onBack}
      onUpdateProgress={(id, page, total) => { void saveReadingProgress(userId, id, page, total); }}
    />
  );
};
