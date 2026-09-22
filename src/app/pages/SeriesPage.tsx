import React, { useState } from "react";
import { Layers, BookOpen, CheckCircle2 } from "lucide-react";
import { Comic, Series } from "../../types/comic";
import { useLibrary } from "../../hooks/useLibrary";
import { ComicCard } from "../../components/library/ComicCard";
import { ComicDetailModal } from "../../components/library/ComicDetailModal";
import { ProgressUpdateModal } from "../../components/library/ProgressUpdateModal";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { Badge } from "../../components/ui/Badge";
import { formatPercentage } from "../../lib/formatters";

interface SeriesPageProps {
  onOpenReader: (comicId: string) => void;
}

export const SeriesPage: React.FC<SeriesPageProps> = ({ onOpenReader }) => {
  const { allComics, seriesList, toggleFavorite, updateProgress, setStatus } = useLibrary();
  const [selectedComic, setSelectedComic] = useState<Comic | null>(null);
  const [comicForProgress, setComicForProgress] = useState<Comic | null>(null);

  // Calcula estatísticas para cada série
  const getSeriesStats = (seriesId: string) => {
    const comicsInSeries = allComics.filter((c) => c.seriesId === seriesId);
    const totalIssues = comicsInSeries.length;
    const completedCount = comicsInSeries.filter(
      (c) => c.progress?.status === "completed"
    ).length;
    const readingCount = comicsInSeries.filter(
      (c) => c.progress?.status === "reading"
    ).length;
    const percent = totalIssues > 0 ? (completedCount / totalIssues) * 100 : 0;

    return {
      comics: comicsInSeries.sort((a, b) => a.issueNumber - b.issueNumber),
      totalIssues,
      completedCount,
      readingCount,
      percent,
    };
  };

  return (
    <div className="streaming-page series-page space-y-10">
      {/* Cabeçalho */}
      <div className="page-spotlight">
        <div className="flex items-center gap-2 text-amber-400 mb-1">
          <Layers className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-wider">Coleções Completas</span>
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">Séries e Arcos</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Acompanhe suas sagas agrupadas com progresso cumulativo de cada coleção
        </p>
      </div>

      {/* Lista de Séries */}
      <div className="space-y-12">
        {seriesList.map((series) => {
          const stats = getSeriesStats(series.id);

          return (
            <section
              key={series.id}
              className="series-showcase rounded-2xl p-5 sm:p-6 shadow-md"
              aria-labelledby={`series-title-${series.id}`}
            >
              {/* Header da Série */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <Badge variant="amber">{series.publisher}</Badge>
                    <Badge variant="outline">
                      {series.startYear}
                      {series.endYear ? ` — ${series.endYear}` : " — Atual"}
                    </Badge>
                    {stats.percent === 100 && (
                      <Badge variant="emerald">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Série Completa
                      </Badge>
                    )}
                  </div>

                  <h2
                    id={`series-title-${series.id}`}
                    className="text-xl sm:text-2xl font-black text-white"
                  >
                    {series.title}
                  </h2>

                  <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-3xl leading-relaxed">
                    {series.description}
                  </p>
                </div>

                {/* Métricas de Progresso da Coleção */}
                <div className="bg-[#141926] p-3.5 rounded-xl border border-slate-700/80 min-w-[200px]">
                  <div className="flex items-center justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-300">Progresso da Coleção</span>
                    <span className="text-amber-400 font-bold font-mono">
                      {stats.completedCount}/{stats.totalIssues} lidas
                    </span>
                  </div>
                  <ProgressBar percentage={stats.percent} size="sm" />
                  <span className="text-[10px] text-slate-400 font-mono mt-1.5 block text-right">
                    {formatPercentage(stats.percent)} concluído
                  </span>
                </div>
              </div>

              {/* Grid das Edições da Série */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                {stats.comics.map((comic) => (
                  <ComicCard
                    key={comic.id}
                    comic={comic}
                    onOpenReader={onOpenReader}
                    onToggleFavorite={toggleFavorite}
                    onOpenDetails={(c) => setSelectedComic(c)}
                    onOpenProgressModal={(c) => setComicForProgress(c)}
                    onMarkCompleted={(id, total) => setStatus(id, "completed", total)}
                    onResetProgress={(id) => setStatus(id, "not_started", 10)}
                    density="compact"
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

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
