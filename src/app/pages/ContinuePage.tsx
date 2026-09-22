import React, { useState } from "react";
import { Clock, Play, CheckCircle2, BookOpen } from "lucide-react";
import { Comic } from "../../types/comic";
import { useLibrary } from "../../hooks/useLibrary";
import { CoverPlaceholder } from "../../components/ui/CoverPlaceholder";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { Button } from "../../components/ui/Button";
import { ComicDetailModal } from "../../components/library/ComicDetailModal";
import { ProgressUpdateModal } from "../../components/library/ProgressUpdateModal";
import { formatPercentage, formatRelativeDate } from "../../lib/formatters";

interface ContinuePageProps {
  onOpenReader: (comicId: string) => void;
}

export const ContinuePage: React.FC<ContinuePageProps> = ({ onOpenReader }) => {
  const { allComics, toggleFavorite, updateProgress, setStatus } = useLibrary();
  const [selectedComic, setSelectedComic] = useState<Comic | null>(null);
  const [comicForProgress, setComicForProgress] = useState<Comic | null>(null);

  const readingComics = allComics
    .filter((c) => c.progress && c.progress.status === "reading")
    .sort((a, b) => {
      const dateA = a.progress?.lastReadAt ? new Date(a.progress.lastReadAt).getTime() : 0;
      const dateB = b.progress?.lastReadAt ? new Date(b.progress.lastReadAt).getTime() : 0;
      return dateB - dateA;
    });

  const completedComics = allComics
    .filter((c) => c.progress && c.progress.status === "completed")
    .sort((a, b) => {
      const dateA = a.progress?.lastReadAt ? new Date(a.progress.lastReadAt).getTime() : 0;
      const dateB = b.progress?.lastReadAt ? new Date(b.progress.lastReadAt).getTime() : 0;
      return dateB - dateA;
    });

  return (
    <div className="space-y-8">
      {/* Cabeçalho da página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1e2535] pb-5">
        <div>
          <div className="flex items-center gap-2 text-amber-400 mb-1">
            <Clock className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Histórico Ativo</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Continuar Lendo</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Retome suas edições exatamente onde você parou com progresso sincronizado
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-[#141824] border border-slate-700/80">
            <span className="text-[10px] text-slate-400 font-semibold block uppercase">Em leitura</span>
            <span className="text-lg font-black text-amber-400 tabular-nums">
              {readingComics.length}
            </span>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-[#141824] border border-slate-700/80">
            <span className="text-[10px] text-slate-400 font-semibold block uppercase">Concluídas</span>
            <span className="text-lg font-black text-emerald-400 tabular-nums">
              {completedComics.length}
            </span>
          </div>
        </div>
      </div>

      {/* Seção Principal: HQs em Leitura */}
      <div>
        <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <span>Edições em Andamento</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
            {readingComics.length}
          </span>
        </h2>

        {readingComics.length === 0 ? (
          <div className="py-12 px-4 text-center bg-[#131722]/50 border border-[#1e2535] rounded-2xl">
            <BookOpen className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <h3 className="text-sm font-bold text-white">Nenhuma HQ em andamento</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Navegue pela biblioteca e inicie a leitura de qualquer edição para acompanhar seu progresso aqui.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {readingComics.map((comic) => {
              const currentPage = comic.progress?.currentPage || 1;
              const totalPages = comic.totalPages;
              const percentage = comic.progress?.percentage || Math.round((currentPage / totalPages) * 100);

              return (
                <div
                  key={comic.id}
                  className="group relative flex bg-[#131722] hover:bg-[#181e2b] border border-[#1e2535] hover:border-slate-700 rounded-xl p-3.5 transition-all shadow-md overflow-hidden"
                >
                  <div
                    onClick={() => onOpenReader(comic.id)}
                    className="w-24 sm:w-28 flex-shrink-0 cursor-pointer rounded-lg overflow-hidden relative shadow-md"
                  >
                    <CoverPlaceholder
                      title={comic.title}
                      seriesTitle={comic.seriesTitle}
                      issueNumber={comic.issueNumber}
                      publisher={comic.publisher}
                      coverStyle={comic.coverStyle}
                      showSpine={false}
                    />
                  </div>

                  <div className="flex-1 min-w-0 ml-4 flex flex-col justify-between py-1">
                    <div>
                      <div className="flex items-center justify-between text-xs text-amber-400 font-bold mb-1">
                        <span className="truncate">{comic.seriesTitle}</span>
                        <span className="font-mono text-slate-400">#{comic.issueNumber}</span>
                      </div>

                      <h3
                        onClick={() => setSelectedComic(comic)}
                        className="text-xs sm:text-sm font-bold text-white hover:text-amber-400 cursor-pointer line-clamp-2 leading-tight"
                      >
                        {comic.title}
                      </h3>

                      <p className="text-xs text-slate-400 mt-2 font-mono">
                        Pág. <strong className="text-white">{currentPage}</strong> de {totalPages}
                      </p>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between text-[11px] mb-1.5 font-mono">
                        <span className="text-slate-400">Progresso</span>
                        <span className="text-amber-400 font-bold">{formatPercentage(percentage)}</span>
                      </div>
                      <ProgressBar percentage={percentage} size="md" className="mb-3" />

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] text-slate-400">
                          {formatRelativeDate(comic.progress?.lastReadAt)}
                        </span>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => onOpenReader(comic.id)}
                          className="font-bold text-xs"
                        >
                          <Play className="w-3 h-3 fill-current mr-1" />
                          Retomar
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Seção Secundária: Concluídas Recentemente */}
      {completedComics.length > 0 && (
        <div className="pt-6 border-t border-[#1e2535]">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>HQs Concluídas</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {completedComics.length}
            </span>
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {completedComics.map((comic) => (
              <div
                key={comic.id}
                onClick={() => setSelectedComic(comic)}
                className="group relative flex flex-col bg-[#131722] p-2.5 rounded-xl border border-slate-800 hover:border-slate-700 cursor-pointer shadow-sm transition-all"
              >
                <div className="relative aspect-[2/3] rounded-lg overflow-hidden mb-2">
                  <CoverPlaceholder
                    title={comic.title}
                    seriesTitle={comic.seriesTitle}
                    issueNumber={comic.issueNumber}
                    publisher={comic.publisher}
                    coverStyle={comic.coverStyle}
                  />
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-emerald-500 text-black font-extrabold text-[9px] shadow">
                    LIDA
                  </div>
                </div>

                <span className="text-[11px] font-bold text-amber-400 truncate">
                  {comic.seriesTitle} #{comic.issueNumber}
                </span>
                <span className="text-xs font-semibold text-slate-200 line-clamp-1">
                  {comic.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modais */}
      <ComicDetailModal
        comic={selectedComic}
        isOpen={selectedComic !== null}
        onClose={() => setSelectedComic(null)}
        onOpenReader={onOpenReader}
        onToggleFavorite={toggleFavorite}
        onOpenProgressModal={(comic) => {
          setSelectedComic(null);
          setComicForProgress(comic);
        }}
        onMarkCompleted={(id, total) => {
          setStatus(id, "completed", total);
          setSelectedComic(null);
        }}
        onResetProgress={(id) => {
          setStatus(id, "not_started", 10);
          setSelectedComic(null);
        }}
      />

      <ProgressUpdateModal
        comic={comicForProgress}
        isOpen={comicForProgress !== null}
        onClose={() => setComicForProgress(null)}
        onSaveProgress={updateProgress}
      />
    </div>
  );
};
