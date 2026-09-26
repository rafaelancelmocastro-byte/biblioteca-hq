import React, { useMemo, useState } from "react";
import { Heart, LibraryBig } from "lucide-react";
import type { Comic } from "../../types/comic";
import { useLibrary } from "../../hooks/useLibrary";
import { ComicCard } from "../../components/library/ComicCard";
import { ComicDetailModal } from "../../components/library/ComicDetailModal";
import { ProgressUpdateModal } from "../../components/library/ProgressUpdateModal";

interface FavoritesPageProps {
  onOpenReader: (comicId: string) => void;
  onNavigateToLibrary: () => void;
  onNavigateToSeries: (seriesId: string) => void;
}

export const FavoritesPage: React.FC<FavoritesPageProps> = ({
  onOpenReader,
  onNavigateToLibrary,
  onNavigateToSeries,
}) => {
  const {
    allComics,
    seriesList,
    favoriteSeriesIds,
    toggleFavorite,
    toggleSeriesFavorite,
    updateProgress,
    setStatus,
    isLoading,
  } = useLibrary();

  const [selectedComic, setSelectedComic] = useState<Comic | null>(null);
  const [comicForProgress, setComicForProgress] = useState<Comic | null>(null);
  const [favoriteError, setFavoriteError] = useState("");

  const favoriteComics = useMemo(() => allComics.filter((comic) => comic.isFavorite), [allComics]);
  const favoriteGroups = useMemo(
    () => seriesList.filter((series) => favoriteSeriesIds.has(series.id)),
    [favoriteSeriesIds, seriesList]
  );

  const groupCover = (id: string) =>
    allComics.find(
      (comic) =>
        comic.seriesId === id ||
        seriesList.some((child) => child.id === comic.seriesId && child.parentSeriesId === id)
    )?.coverUrl;

  const removeGroup = (id: string) => {
    setFavoriteError("");
    void toggleSeriesFavorite(id).catch(() =>
      setFavoriteError("Não foi possível remover o favorito. Tente novamente.")
    );
  };

  return (
    <div className="streaming-page favorites-page space-y-10 sm:space-y-12">
      <header className="px-1 pt-1">
        <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-400">Sua coleção</span>
        <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Favoritos</h1>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-neutral-400 sm:text-sm">
              HQs, coleções e sagas que você marcou para encontrar de novo com facilidade.
            </p>
          </div>
          {!isLoading && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-400">
              <span><strong className="font-semibold text-white">{favoriteComics.length}</strong> HQs</span>
              <span><strong className="font-semibold text-white">{favoriteGroups.length}</strong> coleções e sagas</span>
            </div>
          )}
        </div>
      </header>

      {favoriteError && (
        <p role="alert" className="rounded-xl border border-rose-400/15 bg-rose-400/[0.06] px-3 py-2 text-xs text-rose-300">
          {favoriteError}
        </p>
      )}

      {isLoading ? (
        <div className="empty-collection-kind" role="status">Carregando favoritos...</div>
      ) : favoriteComics.length === 0 && favoriteGroups.length === 0 ? (
        <div className="empty-collection-kind">
          <Heart />
          <h2>Nenhum favorito ainda</h2>
          <p>Marque HQs, coleções ou sagas para reunir suas escolhas nesta página.</p>
          <button
            type="button"
            className="catalog-primary-action mt-4"
            onClick={onNavigateToLibrary}
          >
            <LibraryBig className="h-4 w-4" /> Explorar Biblioteca
          </button>
        </div>
      ) : (
        <>
          {favoriteGroups.length > 0 && (
            <section className="space-y-4" aria-labelledby="favorite-groups-title">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/[0.08] pb-3">
                <div>
                  <h2 id="favorite-groups-title" className="text-xl font-bold tracking-tight text-white">
                    Coleções e sagas
                  </h2>
                  <p className="mt-0.5 text-xs text-neutral-400">Acesse rapidamente os universos que você acompanha.</p>
                </div>
                <span className="text-xs text-neutral-500">{favoriteGroups.length}</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {favoriteGroups.map((series) => {
                  const cover = groupCover(series.id);
                  const kind =
                    series.bannerTone === "saga"
                      ? "Saga"
                      : series.bannerTone === "phase"
                      ? "Fase"
                      : series.bannerTone === "one_shot"
                      ? "Obra fechada"
                      : "Coleção";

                  return (
                    <article
                      key={series.id}
                      className="grid min-w-0 grid-cols-[4.75rem_minmax(0,1fr)] gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3 transition-colors hover:bg-white/[0.045] sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:p-4"
                    >
                      <button
                        type="button"
                        onClick={() => onNavigateToSeries(series.id)}
                        className="overflow-hidden rounded-lg bg-neutral-900 shadow-md"
                        aria-label={`Abrir ${series.title}`}
                      >
                        <div className="aspect-[2/3]">
                          {cover ? <img src={cover} alt="" className="h-full w-full object-cover" loading="lazy" /> : null}
                        </div>
                      </button>

                      <div className="flex min-w-0 flex-col justify-between gap-3">
                        <button type="button" onClick={() => onNavigateToSeries(series.id)} className="min-w-0 text-left">
                          <span className="block truncate text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                            {series.publisher} · {kind}
                          </span>
                          <strong className="mt-1 line-clamp-2 block text-sm font-semibold leading-snug text-white sm:text-base">
                            {series.title}
                          </strong>
                          <span className="mt-1 block text-[11px] text-neutral-400">Explorar edições</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => removeGroup(series.id)}
                          className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-[11px] font-medium text-neutral-300 transition-colors hover:bg-white/[0.06] sm:w-fit"
                          aria-label={`Remover ${series.title} dos favoritos`}
                        >
                          <Heart className="h-3.5 w-3.5 fill-current" /> Remover
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {favoriteComics.length > 0 && (
            <section className="space-y-4" aria-labelledby="favorite-comics-title">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/[0.08] pb-3">
                <div>
                  <h2 id="favorite-comics-title" className="text-xl font-bold tracking-tight text-white">HQs favoritas</h2>
                  <p className="mt-0.5 text-xs text-neutral-400">Edições que você marcou individualmente.</p>
                </div>
                <span className="text-xs text-neutral-500">{favoriteComics.length}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
                {favoriteComics.map((comic) => (
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
        </>
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
