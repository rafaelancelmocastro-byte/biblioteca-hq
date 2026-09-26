import React, { useMemo, useState } from "react";
import { BookOpen, CheckCircle2, Clock3, Play } from "lucide-react";
import type { Comic } from "../../types/comic";
import { useLibrary } from "../../hooks/useLibrary";
import { CoverPlaceholder } from "../../components/ui/CoverPlaceholder";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { ComicCard } from "../../components/library/ComicCard";
import { ComicDetailModal } from "../../components/library/ComicDetailModal";
import { ProgressUpdateModal } from "../../components/library/ProgressUpdateModal";
import { formatPercentage, formatRelativeDate } from "../../lib/formatters";

interface ContinuePageProps {
  onOpenReader: (comicId: string) => void;
}

const readTime = (comic: Comic) => comic.progress?.lastReadAt ? new Date(comic.progress.lastReadAt).getTime() : 0;

export const ContinuePage: React.FC<ContinuePageProps> = ({ onOpenReader }) => {
  const { allComics, toggleFavorite, updateProgress, setStatus, isLoading } = useLibrary();
  const [selectedComic, setSelectedComic] = useState<Comic | null>(null);
  const [comicForProgress, setComicForProgress] = useState<Comic | null>(null);

  const readingComics = useMemo(
    () => allComics.filter((comic) => comic.progress?.status === "reading").sort((a, b) => readTime(b) - readTime(a)),
    [allComics]
  );
  const completedComics = useMemo(
    () => allComics.filter((comic) => comic.progress?.status === "completed").sort((a, b) => readTime(b) - readTime(a)),
    [allComics]
  );
  const featured = readingComics[0];

  return (
    <div className="streaming-page continue-page space-y-10 sm:space-y-12">
      <header className="px-1 pt-1">
        <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-400">Sua leitura</span>
        <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Continuar lendo</h1>
            <p className="mt-1 text-xs leading-relaxed text-neutral-400 sm:text-sm">Retome suas histórias de onde parou.</p>
          </div>
          {!isLoading && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-400">
              <span><strong className="font-semibold text-white">{readingComics.length}</strong> em leitura</span>
              <span><strong className="font-semibold text-white">{completedComics.length}</strong> concluídas</span>
            </div>
          )}
        </div>
      </header>

      {featured && (
        <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 sm:p-5 md:p-6" aria-label="Próxima leitura">
          {featured.coverUrl && (
            <div className="absolute inset-0 -z-10 overflow-hidden opacity-[0.14] blur-3xl pointer-events-none">
              <img src={featured.coverUrl} alt="" className="h-full w-full scale-150 object-cover" aria-hidden="true" />
            </div>
          )}
          <div className="grid gap-5 sm:grid-cols-[7rem_minmax(0,1fr)] sm:items-center md:grid-cols-[8.5rem_minmax(0,1fr)]">
            <button
              type="button"
              onClick={() => onOpenReader(featured.id)}
              className="mx-auto w-28 overflow-hidden rounded-xl shadow-xl sm:mx-0 sm:w-full"
              aria-label={`Retomar ${featured.title}`}
            >
              <div className="aspect-[2/3] w-full overflow-hidden bg-neutral-900">
                {featured.coverUrl ? (
                  <img src={featured.coverUrl} alt={`Capa de ${featured.title}`} className="h-full w-full object-cover" />
                ) : (
                  <CoverPlaceholder
                    title={featured.title}
                    seriesTitle={featured.seriesTitle}
                    issueNumber={featured.issueNumber}
                    publisher={featured.publisher}
                    coverStyle={featured.coverStyle}
                    showSpine={false}
                  />
                )}
              </div>
            </button>

            <div className="min-w-0 text-center sm:text-left">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                Próxima leitura · {featured.seriesTitle} #{featured.issueNumber}
              </span>
              <h2 className="mt-1 break-words text-xl font-bold leading-tight tracking-tight text-white sm:text-2xl md:text-3xl">
                {featured.title}
              </h2>
              <div className="mt-3">
                <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px] text-neutral-400">
                  <span>Página {featured.progress?.currentPage || 1} de {featured.totalPages}</span>
                  <strong className="font-semibold text-white">{formatPercentage(featured.progress?.percentage || 0)}</strong>
                </div>
                <ProgressBar percentage={featured.progress?.percentage || 0} size="md" />
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => onOpenReader(featured.id)}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-white px-6 text-xs font-semibold text-black transition-colors hover:bg-neutral-200 sm:w-auto sm:text-sm"
                >
                  <Play className="h-3.5 w-3.5 fill-current" /> Retomar
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedComic(featured)}
                  className="min-h-11 w-full rounded-full border border-white/15 bg-white/5 px-5 text-xs font-medium text-white transition-colors hover:bg-white/10 sm:w-auto sm:text-sm"
                >
                  Detalhes
                </button>
                <span className="text-[10.5px] text-neutral-500 sm:ml-1">{formatRelativeDate(featured.progress?.lastReadAt)}</span>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="space-y-4" aria-labelledby="reading-progress-title">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/[0.08] pb-3">
          <div>
            <h2 id="reading-progress-title" className="text-xl font-bold tracking-tight text-white">Leituras em andamento</h2>
            <p className="mt-0.5 text-xs text-neutral-400">Todas as edições que você começou e ainda não concluiu.</p>
          </div>
          {!isLoading && <span className="text-xs text-neutral-400">{readingComics.length} {readingComics.length === 1 ? "edição" : "edições"}</span>}
        </div>

        {isLoading ? (
          <div className="empty-collection-kind" role="status">Carregando leituras...</div>
        ) : readingComics.length === 0 ? (
          <div className="empty-collection-kind">
            <BookOpen />
            <h3>Nenhuma leitura em andamento</h3>
            <p>Inicie uma edição na Biblioteca para acompanhar seu progresso aqui.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {readingComics.map((comic) => {
              const currentPage = comic.progress?.currentPage || 1;
              const percentage = comic.progress?.percentage || Math.round((currentPage / Math.max(comic.totalPages, 1)) * 100);
              return (
                <article key={comic.id} className="flex min-w-0 gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3 transition-colors hover:bg-white/[0.045] sm:gap-4 sm:p-4">
                  <button
                    type="button"
                    onClick={() => onOpenReader(comic.id)}
                    className="w-[4.75rem] shrink-0 overflow-hidden rounded-lg shadow-md sm:w-24"
                    aria-label={`Retomar ${comic.title}`}
                  >
                    <div className="aspect-[2/3] w-full bg-neutral-900">
                      {comic.coverUrl ? (
                        <img src={comic.coverUrl} alt={`Capa de ${comic.title}`} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <CoverPlaceholder
                          title={comic.title}
                          seriesTitle={comic.seriesTitle}
                          issueNumber={comic.issueNumber}
                          publisher={comic.publisher}
                          coverStyle={comic.coverStyle}
                          showSpine={false}
                        />
                      )}
                    </div>
                  </button>

                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div className="min-w-0">
                      <span className="block truncate text-[10.5px] font-semibold uppercase tracking-wide text-neutral-500">
                        {comic.seriesTitle} · #{comic.issueNumber}
                      </span>
                      <button type="button" onClick={() => setSelectedComic(comic)} className="mt-1 line-clamp-2 text-left text-sm font-semibold leading-snug text-white hover:text-neutral-300">
                        {comic.title}
                      </button>
                    </div>

                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between gap-2 text-[10.5px] text-neutral-500">
                        <span>Pág. {currentPage}/{comic.totalPages}</span>
                        <span className="font-semibold text-neutral-300">{formatPercentage(percentage)}</span>
                      </div>
                      <ProgressBar percentage={percentage} size="sm" />
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[10px] text-neutral-500">{formatRelativeDate(comic.progress?.lastReadAt)}</span>
                        <button
                          type="button"
                          onClick={() => onOpenReader(comic.id)}
                          className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-white px-3 text-[11px] font-semibold text-black hover:bg-neutral-200"
                        >
                          <Play className="h-3 w-3 fill-current" /> Retomar
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {completedComics.length > 0 && (
        <section className="space-y-4 border-t border-white/[0.06] pt-6" aria-labelledby="completed-title">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-neutral-400" />
              <h2 id="completed-title" className="text-xl font-bold tracking-tight text-white">Concluídas recentemente</h2>
            </div>
            <span className="text-xs text-neutral-400">{completedComics.length} {completedComics.length === 1 ? "edição" : "edições"}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
            {completedComics.map((comic) => (
              <ComicCard
                key={comic.id}
                comic={comic}
                density="compact"
                onOpenReader={onOpenReader}
                onToggleFavorite={toggleFavorite}
                onOpenDetails={setSelectedComic}
                onOpenProgressModal={setComicForProgress}
                onMarkCompleted={(id, total) => setStatus(id, "completed", total)}
                onResetProgress={(id) => setStatus(id, "not_started", 10)}
              />
            ))}
          </div>
        </section>
      )}

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
