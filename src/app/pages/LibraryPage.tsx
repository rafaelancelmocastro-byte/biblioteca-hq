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
import { BookOpen, Compass, Info, Sparkles, ChevronDown, ChevronUp } from "lucide-react";

interface LibraryPageProps {
  onOpenReader: (comicId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isFilterDrawerOpen?: boolean;
  onCloseFilterDrawer?: () => void;
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
  const [heroMode, setHeroMode] = useState<"coverflow" | "cinema">("coverflow");
  const [showExtras, setShowExtras] = useState(false);
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

  React.useEffect(() => {
    if (featuredCandidates.length < 2 || searchQuery || heroMode === "coverflow") return;
    const timer = window.setInterval(() => setFeaturedIndex((index) => (index + 1) % featuredCandidates.length), 8500);
    return () => window.clearInterval(timer);
  }, [featuredCandidates.length, searchQuery, heroMode]);

  return (
    <div className="streaming-page library-page space-y-12">
      {/* 1. Hero Billboard Cinematográfico com Cover Flow Integrado */}
      {featuredComic && !searchQuery && (
        <section className={`catalog-hero ${heroMode === "cinema" ? "catalog-hero-flow" : ""}`} aria-label="Destaque da biblioteca">
          {featuredComic.coverUrl && (
            <img src={featuredComic.coverUrl} alt="" className="catalog-hero-art" aria-hidden="true" />
          )}
          <div className="catalog-hero-vignette" />

          {/* Toggle de Modo no Topo do Hero: Cover Flow (1º padrão) vs Modo Cinema (2º) */}
          <div className="catalog-hero-mode-toggle" aria-label="Modo de exibição do destaque">
            <button
              type="button"
              className={heroMode === "coverflow" ? "active" : ""}
              onClick={() => setHeroMode("coverflow")}
              title="Exibição em Cover Flow 3D (Configuração padrão)"
            >
              Cover Flow
            </button>
            <button
              type="button"
              className={heroMode === "cinema" ? "active" : ""}
              onClick={() => setHeroMode("cinema")}
              title="Exibição em Modo Cinema (2ª opção)"
            >
              Modo Cinema
            </button>
          </div>

          {heroMode === "cinema" ? (
            <>
              <div className="catalog-hero-content">
                <div className="catalog-eyebrow">
                  <BookOpen /> Destaque do Acervo
                </div>
                <p className="catalog-kicker">{featuredComic.seriesTitle} · #{featuredComic.issueNumber}</p>
                <h1>{featuredComic.title}</h1>
                <p className="catalog-hero-copy">
                  {featuredComic.synopsis || `${featuredComic.totalPages} páginas em alta definição, disponíveis no seu acervo pessoal.`}
                </p>
                <div className="catalog-hero-meta">
                  <span>{featuredComic.year}</span><i />
                  <span>{featuredComic.publisher}</span><i />
                  <span>{featuredComic.totalPages} páginas</span>
                  {featuredComic.tags.slice(0, 2).map((tag) => (
                    <React.Fragment key={tag}>
                      <i />
                      <span>{tag}</span>
                    </React.Fragment>
                  ))}
                </div>
                <div className="catalog-hero-actions">
                  <button onClick={() => onOpenReader(featuredComic.id)} className="catalog-primary-action">
                    <BookOpen /> {featuredComic.progress?.percentage ? "Continuar leitura" : "Ler agora"}
                  </button>
                  <button onClick={() => setSelectedComic(featuredComic)} className="catalog-secondary-action">
                    <Info /> Detalhes
                  </button>
                  {onOpenGuide && (
                    <button onClick={onOpenGuide} className="catalog-secondary-action">
                      <Compass /> Guia
                    </button>
                  )}
                </div>
              </div>

              {/* Cover Flow sutil e responsivo na lateral direita em telas médias/largas */}
              <div className="catalog-hero-flow-slot">
                <CoverFlow
                  items={featuredCandidates.map((comic) => ({
                    id: comic.id,
                    title: comic.title,
                    image: comic.coverUrl,
                    subtitle: `${comic.year} · ${comic.totalPages} páginas`,
                  }))}
                  activeIndex={featuredIndex}
                  onChange={setFeaturedIndex}
                  onActivate={(item) => setSelectedComic(featuredCandidates.find((comic) => comic.id === item.id) || null)}
                  label="HQs recomendadas em Cover Flow"
                />
              </div>
            </>
          ) : (
            /* Modo Cover Flow 3D Expandido com Foco Total na Interação */
            <div className="catalog-hero-full-stage">
              <div className="text-center mb-4 max-w-xl mx-auto px-4 z-10">
                <p className="text-xs uppercase tracking-widest text-blue-400 font-bold mb-1">
                  {featuredComic.seriesTitle} · #{featuredComic.issueNumber}
                </p>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {featuredComic.title}
                </h2>
                <div className="flex items-center justify-center gap-2 text-xs text-neutral-400 mt-1">
                  <span>{featuredComic.year}</span>
                  <span>·</span>
                  <span>{featuredComic.publisher}</span>
                  <span>·</span>
                  <span>{featuredComic.totalPages} páginas</span>
                </div>
              </div>

              <div className="w-full max-w-4xl mx-auto z-10 px-2">
                <CoverFlow
                  items={featuredCandidates.map((comic) => ({
                    id: comic.id,
                    title: comic.title,
                    image: comic.coverUrl,
                    subtitle: `${comic.year} · ${comic.totalPages} páginas`,
                  }))}
                  activeIndex={featuredIndex}
                  onChange={setFeaturedIndex}
                  onActivate={(item) => setSelectedComic(featuredCandidates.find((comic) => comic.id === item.id) || null)}
                  label="HQs em Cover Flow 3D"
                />
              </div>

              <div className="flex items-center justify-center gap-3 mt-4 z-10">
                <button onClick={() => onOpenReader(featuredComic.id)} className="catalog-primary-action">
                  <BookOpen /> {featuredComic.progress?.percentage ? "Continuar leitura" : "Ler agora"}
                </button>
                <button onClick={() => setSelectedComic(featuredComic)} className="catalog-secondary-action">
                  <Info /> Ver detalhes
                </button>
              </div>
            </div>
          )}
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
        <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Catálogo Completo
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              Explore todo o acervo por coleção, status de leitura e filtros
            </p>
          </div>
          {!isLoading && allComics.length > 0 && (
            <div className="text-xs text-neutral-400 font-medium">
              <strong className="text-white font-bold">{allComics.length}</strong> títulos disponíveis
            </div>
          )}
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

      {/* 6. Curadoria Especial & Estatísticas (Gaveta discreta no rodapé para não poluir o feed principal) */}
      {!searchQuery && allComics.length > 0 && (
        <section className="pt-8 border-t border-white/5">
          <button
            type="button"
            onClick={() => setShowExtras(!showExtras)}
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold text-white">
                Descobertas Personalizadas & Estatísticas de Leitura
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-neutral-400">
              <span>{showExtras ? "Ocultar" : "Explorar"}</span>
              {showExtras ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {showExtras && (
            <div className="mt-4 space-y-6 animate-in fade-in duration-200">
              <RecommendationRoulette
                comics={allComics}
                onOpenReader={onOpenReader}
                onOpenDetails={setSelectedComic}
              />
              <ReadingInsights comics={allComics} />
            </div>
          )}
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
