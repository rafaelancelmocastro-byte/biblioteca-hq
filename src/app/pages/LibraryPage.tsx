import React, { useState } from "react";
import { Comic } from "../../types/comic";
import { ContinueReadingSection } from "../../components/library/ContinueReadingSection";
import { RecentSection } from "../../components/library/RecentSection";
import { LibraryFilterBar } from "../../components/library/LibraryFilterBar";
import { LibraryGrid } from "../../components/library/LibraryGrid";
import { ComicDetailModal } from "../../components/library/ComicDetailModal";
import { ProgressUpdateModal } from "../../components/library/ProgressUpdateModal";
import { useLibrary } from "../../hooks/useLibrary";

interface LibraryPageProps {
  onOpenReader: (comicId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isFilterDrawerOpen?: boolean;
  onCloseFilterDrawer?: () => void;
}

export const LibraryPage: React.FC<LibraryPageProps> = ({
  onOpenReader,
  searchQuery,
  onSearchChange,
  isFilterDrawerOpen,
  onCloseFilterDrawer,
}) => {
  const {
    filteredComics,
    continueReadingComics,
    recentlyAddedComics,
    seriesList,
    charactersList,
    publishers,
    years,
    filters,
    setFilters,
    resetFilters,
    gridDensity,
    setGridDensity,
    toggleFavorite,
    updateProgress,
    setStatus,
  } = useLibrary();

  // Sincroniza query global da busca do cabeçalho com o filtro
  React.useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      searchQuery,
    }));
  }, [searchQuery, setFilters]);

  const [selectedComic, setSelectedComic] = useState<Comic | null>(null);
  const [comicForProgress, setComicForProgress] = useState<Comic | null>(null);

  return (
    <div className="space-y-8">
      {/* Seção 1: Continuar Lendo (cards horizontais) - aparece se não houver busca ativa */}
      {!searchQuery && filters.series === "all" && filters.status === "all" && (
        <ContinueReadingSection
          comics={continueReadingComics}
          onOpenReader={onOpenReader}
          onOpenDetails={(comic) => setSelectedComic(comic)}
        />
      )}

      {/* Seção 2: Adicionadas Recentemente - aparece se não houver busca ativa */}
      {!searchQuery && filters.series === "all" && filters.status === "all" && (
        <RecentSection
          comics={recentlyAddedComics}
          onOpenReader={onOpenReader}
          onToggleFavorite={toggleFavorite}
          onOpenDetails={(comic) => setSelectedComic(comic)}
          onOpenProgressModal={(comic) => setComicForProgress(comic)}
          onMarkCompleted={(id, total) => setStatus(id, "completed", total)}
          onResetProgress={(id) => setStatus(id, "not_started", 10)}
        />
      )}

      {/* Seção 3: Toda a Biblioteca com Filtros e Ordenação */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              Toda a Biblioteca
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Explore o acervo completo, filtre por série, autor ou status de leitura
            </p>
          </div>
        </div>

        {/* Barra de Filtros e Ordenação */}
        <LibraryFilterBar
          filters={filters}
          onFilterChange={setFilters}
          onResetFilters={resetFilters}
          seriesList={seriesList}
          charactersList={charactersList}
          publishers={publishers}
          years={years}
          gridDensity={gridDensity}
          onDensityChange={setGridDensity}
          totalFilteredCount={filteredComics.length}
          isFilterDrawerOpen={isFilterDrawerOpen}
          onCloseFilterDrawer={onCloseFilterDrawer}
        />

        {/* Grid de Capas */}
        <LibraryGrid
          comics={filteredComics}
          onOpenReader={onOpenReader}
          onToggleFavorite={toggleFavorite}
          onOpenDetails={(comic) => setSelectedComic(comic)}
          onOpenProgressModal={(comic) => setComicForProgress(comic)}
          onMarkCompleted={(id, total) => setStatus(id, "completed", total)}
          onResetProgress={(id) => setStatus(id, "not_started", 10)}
          density={gridDensity}
          onResetFilters={resetFilters}
        />
      </div>

      {/* Modal de Detalhes da HQ */}
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

      {/* Modal de Alteração de Progresso */}
      <ProgressUpdateModal
        comic={comicForProgress}
        isOpen={comicForProgress !== null}
        onClose={() => setComicForProgress(null)}
        onSaveProgress={updateProgress}
      />
    </div>
  );
};
