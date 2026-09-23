import React, { useState } from "react";
import { Heart, Sparkles } from "lucide-react";
import { Comic } from "../../types/comic";
import { useLibrary } from "../../hooks/useLibrary";
import { ComicCard } from "../../components/library/ComicCard";
import { ComicDetailModal } from "../../components/library/ComicDetailModal";
import { ProgressUpdateModal } from "../../components/library/ProgressUpdateModal";
import { Button } from "../../components/ui/Button";

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
  const { allComics, seriesList, favoriteSeriesIds, toggleFavorite, toggleSeriesFavorite, updateProgress, setStatus, gridDensity } = useLibrary();
  const [selectedComic, setSelectedComic] = useState<Comic | null>(null);
  const [comicForProgress, setComicForProgress] = useState<Comic | null>(null);
  const [favoriteError, setFavoriteError] = useState("");

  const favoriteComics = allComics.filter((c) => c.isFavorite);
  const favoriteGroups = seriesList.filter((series) => favoriteSeriesIds.has(series.id));

  return (
    <div className="streaming-page favorites-page space-y-8">
      {/* Cabeçalho */}
      <div className="page-spotlight flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-rose-400 mb-1">
            <Heart className="w-5 h-5 fill-rose-500" />
            <span className="text-xs font-bold uppercase tracking-wider">Sua seleção</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Seus favoritos</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            HQs, coleções e sagas que você escolheu acompanhar
          </p>
        </div>

        <div className="px-4 py-2 rounded-xl bg-[#141824] border border-slate-700/80">
          <span className="text-[10px] text-slate-400 font-semibold block uppercase">Total Marcado</span>
          <span className="text-lg font-black text-rose-400 tabular-nums">
            {favoriteComics.length + favoriteGroups.length}
          </span>
        </div>
      </div>

      {favoriteError && <p role="alert" className="text-rose-400">{favoriteError}</p>}

      {/* Grid de Favoritos */}
      {favoriteGroups.length > 0 && <section aria-label="Coleções e sagas favoritas"><h2 className="streaming-heading mb-4">Coleções e sagas</h2><div className="favorite-groups-grid">{favoriteGroups.map((series) => {
        const cover = allComics.find((comic) => comic.seriesId === series.id || seriesList.some((child) => child.id === comic.seriesId && child.parentSeriesId === series.id))?.coverUrl;
        return <article className="favorite-group-card" key={series.id}><button type="button" onClick={() => onNavigateToSeries(series.id)} aria-label={`Abrir ${series.title}`}>{cover && <img src={cover} alt="" loading="lazy" />}<div><small>{series.publisher} · {series.bannerTone === "saga" ? "Saga" : series.bannerTone === "one_shot" ? "Obra fechada" : "Coleção"}</small><strong>{series.title}</strong><span>Explorar edições</span></div></button><button type="button" className="favorite-group-remove" onClick={() => { setFavoriteError(""); void toggleSeriesFavorite(series.id).catch(() => setFavoriteError("Não foi possível remover o favorito. Tente novamente.")); }} aria-label={`Remover ${series.title} dos favoritos`}><Heart className="w-4 h-4 fill-current" /> Remover</button></article>;
      })}</div></section>}
      {favoriteComics.length === 0 && favoriteGroups.length === 0 ? (
        <div className="py-16 px-4 text-center bg-[#131722]/50 border border-[#1e2535] rounded-2xl">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <Heart className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">Nenhum favorito selecionado</h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto mb-6">
            Toque no coração de uma HQ, coleção ou saga para guardá-la aqui.
          </p>
          <Button variant="primary" onClick={onNavigateToLibrary}>
            <Sparkles className="w-4 h-4 mr-2" />
            Explorar Biblioteca
          </Button>
        </div>
      ) : favoriteComics.length > 0 && (
        <section><h2 className="streaming-heading mb-4">HQs favoritas</h2><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-5">
          {favoriteComics.map((comic) => (
            <ComicCard
              key={comic.id}
              comic={comic}
              onOpenReader={onOpenReader}
              onToggleFavorite={toggleFavorite}
              onOpenDetails={(c) => setSelectedComic(c)}
              onOpenProgressModal={(c) => setComicForProgress(c)}
              onMarkCompleted={(id, total) => setStatus(id, "completed", total)}
              onResetProgress={(id) => setStatus(id, "not_started", 10)}
              density={gridDensity}
            />
          ))}
        </div></section>
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
