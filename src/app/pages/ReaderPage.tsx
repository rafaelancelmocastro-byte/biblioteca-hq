import React, { useState, useEffect } from "react";
import { Comic } from "../../types/comic";
import { getSupabaseComicById } from "../../services/supabaseCatalogRepository";
import { storageProvider } from "../../services/storageProvider";
import { ComicReader } from "../../components/reader/ComicReader";
import { useLibrary } from "../../hooks/useLibrary";
import { Button } from "../../components/ui/Button";
import { ArrowLeft, BookX } from "lucide-react";

interface ReaderPageProps {
  comicId: string;
  onBack: () => void;
}

export const ReaderPage: React.FC<ReaderPageProps> = ({ comicId, onBack }) => {
  const [comic, setComic] = useState<Comic | null>(null);
  const [pdfUrl, setPdfUrl] = useState("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { updateProgress } = useLibrary();

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    getSupabaseComicById(comicId)
      .then(async (data) => {
        if (isMounted) {
          setComic(data);
          if (data?.pdfPath) setPdfUrl(await storageProvider.getFileUrl(data.pdfPath));
          setIsLoading(false);
        }
      })
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

  if (!comic || !pdfUrl) {
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
      onBack={onBack}
      onUpdateProgress={updateProgress}
    />
  );
};
