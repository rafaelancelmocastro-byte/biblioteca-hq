import React, { useState } from "react";
import { Comic, LibraryFilters } from "../../types/comic";
import { ContinueReadingSection } from "../../components/library/ContinueReadingSection";
import { RecentSection } from "../../components/library/RecentSection";
import { LibraryFilterBar } from "../../components/library/LibraryFilterBar";
import { LibraryGrid } from "../../components/library/LibraryGrid";
import { ComicDetailModal } from "../../components/library/ComicDetailModal";
import { ProgressUpdateModal } from "../../components/library/ProgressUpdateModal";
import { RecommendationRoulette } from "../../components/library/RecommendationRoulette";
import { ReadingInsights } from "../../components/library/ReadingInsights";
import { CoverFlow } from "../../components/library/CoverFlow";
import { ComicCard } from "../../components/library/ComicCard";
import { useLibrary } from "../../hooks/useLibrary";
import { BookOpen, Sparkles } from "lucide-react";

interface LibraryPageProps {
  onOpenReader: (comicId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isFilterDrawerOpen?: boolean;
  onCloseFilterDrawer?: () => void;
  onToggleFilterDrawer?: () => void;
  onOpenGuide?: () => void;
  onOpenLaunches?: () => void;
}

let rememberedView: { filters?: LibraryFilters; catalogPage: number; featuredIndex: number; selectedComic: Comic | null } = { catalogPage: 1, featuredIndex: 0, selectedComic: null };

export const LibraryPage: React.FC<LibraryPageProps> = ({
  onOpenReader,
  searchQuery,
  onSearchChange,
  isFilterDrawerOpen,
  onCloseFilterDrawer,
  onToggleFilterDrawer,
  onOpenGuide,
  onOpenLaunches,
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
    allComics,
    isLoading,
  } = useLibrary(rememberedView.filters);

  // Sincroniza query global da busca do cabeçalho com o filtro
  React.useEffect(() => {
    setFilters((prev) => prev.searchQuery === searchQuery ? prev : { ...prev, searchQuery });
  }, [searchQuery, setFilters]);

  React.useEffect(() => {
    if (!isFilterDrawerOpen || window.innerWidth < 768) return;
    window.requestAnimationFrame(() => {
      document.getElementById("library-filter-panel")?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [isFilterDrawerOpen]);

  const [selectedComic, setSelectedComic] = useState<Comic | null>(rememberedView.selectedComic);
  const [comicForProgress, setComicForProgress] = useState<Comic | null>(null);
  const [featuredIndex, setFeaturedIndex] = useState(rememberedView.featuredIndex);
  const [catalogPage, setCatalogPage] = useState(rememberedView.catalogPage);

  React.useEffect(() => {
    rememberedView = { filters, catalogPage, featuredIndex, selectedComic };
  }, [filters, catalogPage, featuredIndex, selectedComic]);

  const catalogPageSize = 24;
  const catalogPageCount = Math.max(1, Math.ceil(filteredComics.length / catalogPageSize));
  const currentCatalogPage = Math.min(catalogPage, catalogPageCount);
  const visibleComics = filteredComics.slice((currentCatalogPage - 1) * catalogPageSize, currentCatalogPage * catalogPageSize);

  const filtersMounted = React.useRef(false);
  React.useEffect(() => {
    if (filtersMounted.current) setCatalogPage(1);
    else filtersMounted.current = true;
  }, [filters]);

  const goToCatalogPage = (page: number) => {
    setCatalogPage(page);
    window.requestAnimationFrame(() => document.getElementById("catalogo-completo")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const featuredCandidates = React.useMemo(() => {
    const preferred = allComics.filter((comic) => comic.isFavorite || comic.progress?.status === "reading");
    const pool = [...preferred, ...recentlyAddedComics, ...allComics];
    return [...new Map(pool.map((comic) => [comic.id, comic])).values()].slice(0, 8);
  }, [allComics, recentlyAddedComics]);

  const featuredComic = featuredCandidates[featuredIndex % Math.max(featuredCandidates.length, 1)];
  const launches = React.useMemo(() => allComics.filter((comic) => comic.year === 2026).slice(0, 12), [allComics]);

  return (
    <div className="streaming-page library-page space-y-12">
      {/* 1. Hero Cover Flow Definitivo: Capa como protagonista central */}
      {featuredComic && !searchQuery && (
        <section className="relative pt-2 pb-6 overflow-hidden" aria-label="Destaque da biblioteca">
          {/* Fundo suave com iluminação sutil baseada na capa ativa */}
          {featuredComic.coverUrl && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20 blur-3xl -z-10">
              <img
                src={featuredComic.coverUrl}
                alt=""
                className="w-full h-full object-cover scale-150 transform -translate-y-1/4"
                aria-hidden="true"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-[#05090f]/50 via-[#05090f]/80 to-[#05090f]" />
            </div>
          )}

          {/* Palco do Cover Flow Centralizado */}
          <div className="w-full max-w-4xl mx-auto px-2">
            <CoverFlow
              items={featuredCandidates.map((comic) => ({
                id: comic.id,
                title: comic.title,
                image: comic.coverUrl,
                subtitle: `${comic.seriesTitle} #${comic.issueNumber}`,
              }))}
              activeIndex={featuredIndex}
              onChange={setFeaturedIndex}
              onActivate={(item) => setSelectedComic(featuredCandidates.find((comic) => comic.id === item.id) || null)}
              label="HQs em destaque"
            />
          </div>

          {/* Título, Metadados e CTAs Posicionados Abaixo do Carrossel */}
          <div className="text-center mt-5 max-w-xl mx-auto px-4">
            <span className="text-xs uppercase tracking-wider text-neutral-400 font-semibold block mb-1">
              {featuredComic.seriesTitle} · #{featuredComic.issueNumber}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
              {featuredComic.title}
            </h1>
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm text-neutral-400 mt-1.5">
              <span>{featuredComic.year}</span>
              <span>·</span>
              <span>{featuredComic.publisher}</span>
              <span>·</span>
              <span>{featuredComic.totalPages} páginas</span>
            </div>

            {/* CTAs principais */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
              <button
                onClick={() => onOpenReader(featuredComic.id)}
                className="h-11 px-6 sm:px-7 rounded-full bg-white text-black font-semibold text-xs sm:text-sm hover:bg-neutral-200 transition-colors shadow-lg cursor-pointer flex items-center justify-center gap-2 max-w-full"
              >
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>
                  {((featuredComic.progress?.currentPage || 0) > 0 || (featuredComic.progress?.percentage || 0) > 0)
                    ? "Retomar"
                    : "Iniciar Leitura"}
                </span>
              </button>
              <button
                onClick={() => setSelectedComic(featuredComic)}
                className="h-11 px-5 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-white font-medium text-xs sm:text-sm transition-colors cursor-pointer shrink-0"
              >
                Detalhes
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 2. Seção "Seguir Lendo" (Up Next da Apple) - imediatamente após o Hero */}
      {!searchQuery && filters.series === "all" && filters.status === "all" && (
        <ContinueReadingSection
          comics={continueReadingComics}
          onOpenReader={onOpenReader}
          onOpenDetails={(comic) => setSelectedComic(comic)}
        />
      )}

      {/* 3. Seção "Novidades no Acervo" (Trilho horizontal de streaming) */}
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

      {/* 4. Seção "Edições de 2026" (Trilho editorial com acabamento Apple TV+) */}
      {!searchQuery && launches.length > 0 && filters.series === "all" && filters.status === "all" && (
        <section className="streaming-section" aria-labelledby="launches-2026-title">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <h2 id="launches-2026-title" className="streaming-heading">
                Edições de 2026
              </h2>
              <span className="text-xs text-neutral-400 font-medium">
                · Publicações recentes
              </span>
            </div>
            {onOpenLaunches && (
              <button
                type="button"
                onClick={onOpenLaunches}
                className="text-xs text-neutral-300 hover:text-white transition-colors cursor-pointer"
              >
                Ver todas →
              </button>
            )}
          </div>
          <div className="streaming-rail">
            {launches.map((comic) => (
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

      {/* 5. Catálogo Completo com Segmented Controls e Grade Fluida */}
      <div id="catalogo-completo" className="pt-2">
        <div className="flex items-baseline justify-between mb-4">
          <div className="flex items-baseline gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Catálogo completo
            </h2>
            {!isLoading && allComics.length > 0 && (
              <span className="text-sm text-neutral-400 font-normal">
                · {filteredComics.length} {filteredComics.length === 1 ? "título" : "títulos"}
              </span>
            )}
          </div>
        </div>

        {/* Barra de Filtros Minimalista com Segmented Controls */}
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
          onToggleFilterDrawer={onToggleFilterDrawer}
        />

        {/* Grid de Capas */}
        <LibraryGrid
          comics={visibleComics}
          onOpenReader={onOpenReader}
          onToggleFavorite={toggleFavorite}
          onOpenDetails={(comic) => setSelectedComic(comic)}
          onOpenProgressModal={(comic) => setComicForProgress(comic)}
          onMarkCompleted={(id, total) => setStatus(id, "completed", total)}
          onResetProgress={(id) => setStatus(id, "not_started", 10)}
          density={gridDensity}
          onResetFilters={resetFilters}
        />

        {filteredComics.length > catalogPageSize && (
          <nav className="catalog-pagination" aria-label="Páginas do catálogo">
            <span>
              Mostrando {(currentCatalogPage - 1) * catalogPageSize + 1}–{Math.min(currentCatalogPage * catalogPageSize, filteredComics.length)} de {filteredComics.length}
            </span>
            <div className="catalog-pagination-actions">
              <button
                type="button"
                disabled={currentCatalogPage === 1}
                onClick={() => goToCatalogPage(currentCatalogPage - 1)}
              >
                Anterior
              </button>
              <span aria-live="polite">
                Página {currentCatalogPage} de {catalogPageCount}
              </span>
              <button
                type="button"
                disabled={currentCatalogPage === catalogPageCount}
                onClick={() => goToCatalogPage(currentCatalogPage + 1)}
              >
                Próxima
              </button>
            </div>
          </nav>
        )}
      </div>

      {/* 5. Bloco Editorial "Não sabe o que ler?" abaixo do catálogo */}
      {!searchQuery && allComics.length > 0 && (
        <section className="pt-8 border-t border-white/5 space-y-6">
          <RecommendationRoulette
            comics={allComics}
            onOpenReader={onOpenReader}
            onOpenDetails={setSelectedComic}
          />
        </section>
      )}

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
