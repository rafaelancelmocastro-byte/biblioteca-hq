import React, { useState } from "react";
import { Comic } from "../../types/comic";
import { ContinueReadingSection } from "../../components/library/ContinueReadingSection";
import { RecentSection } from "../../components/library/RecentSection";
import { LibraryFilterBar } from "../../components/library/LibraryFilterBar";
import { LibraryGrid } from "../../components/library/LibraryGrid";
import { ComicDetailModal } from "../../components/library/ComicDetailModal";
import { ProgressUpdateModal } from "../../components/library/ProgressUpdateModal";
import { RecommendationRoulette } from "../../components/library/RecommendationRoulette";
import { ReadingInsights } from "../../components/library/ReadingInsights";
import { ComicsNews } from "../../components/library/ComicsNews";
import { CoverFlow } from "../../components/library/CoverFlow";
import { ComicCard } from "../../components/library/ComicCard";
import { useLibrary } from "../../hooks/useLibrary";
import { BookOpen, Compass, Info, LibraryBig } from "lucide-react";

interface LibraryPageProps {
  onOpenReader: (comicId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isFilterDrawerOpen?: boolean;
  onCloseFilterDrawer?: () => void;
  onOpenGuide?: () => void;
}

export const LibraryPage: React.FC<LibraryPageProps> = ({
  onOpenReader,
  searchQuery,
  onSearchChange,
  isFilterDrawerOpen,
  onCloseFilterDrawer,
  onOpenGuide,
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
  } = useLibrary();

  // Sincroniza query global da busca do cabeçalho com o filtro
  React.useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      searchQuery,
    }));
  }, [searchQuery, setFilters]);

  React.useEffect(() => {
    if (!isFilterDrawerOpen || window.innerWidth < 768) return;
    window.requestAnimationFrame(() => {
      document.getElementById("library-filter-panel")?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [isFilterDrawerOpen]);

  const [selectedComic, setSelectedComic] = useState<Comic | null>(null);
  const [comicForProgress, setComicForProgress] = useState<Comic | null>(null);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const featuredCandidates = React.useMemo(() => {
    const preferred = allComics.filter((comic) => comic.isFavorite || comic.progress?.status === "reading");
    const pool = [...preferred, ...recentlyAddedComics, ...allComics];
    return [...new Map(pool.map((comic) => [comic.id, comic])).values()].slice(0, 8);
  }, [allComics, recentlyAddedComics]);
  const featuredComic = featuredCandidates[featuredIndex % Math.max(featuredCandidates.length, 1)];
  const launches = React.useMemo(() => allComics.filter((comic) => comic.year === 2026).slice(0, 12), [allComics]);

  React.useEffect(() => {
    if (featuredCandidates.length < 2 || searchQuery) return;
    const timer = window.setInterval(() => setFeaturedIndex((index) => (index + 1) % featuredCandidates.length), 8500);
    return () => window.clearInterval(timer);
  }, [featuredCandidates.length, searchQuery]);

  return (
    <div className="streaming-page library-page space-y-8">
      {featuredComic && !searchQuery && (
        <section className="catalog-hero catalog-hero-flow" aria-label="Destaque da biblioteca">
          {featuredComic.coverUrl && (
            <img src={featuredComic.coverUrl} alt="" className="catalog-hero-art" aria-hidden="true" />
          )}
          <div className="catalog-hero-vignette" />
          <div className="catalog-hero-content">
            <div className="catalog-eyebrow"><BookOpen /> Sua próxima história começa aqui</div>
            <p className="catalog-kicker">{featuredComic.seriesTitle} · edição {featuredComic.issueNumber}</p>
            <h1>{featuredComic.title}</h1>
            <p className="catalog-hero-copy">
              {featuredComic.synopsis || `${featuredComic.totalPages} páginas em alta definição, disponíveis no seu acervo pessoal.`}
            </p>
            <div className="catalog-hero-meta">
              <span>{featuredComic.year}</span><i />
              <span>{featuredComic.publisher}</span><i />
              <span>{featuredComic.totalPages} páginas</span>
              {featuredComic.tags.slice(0, 2).map((tag) => <React.Fragment key={tag}><i /><span>{tag}</span></React.Fragment>)}
            </div>
            <div className="catalog-hero-actions">
              <button onClick={() => onOpenReader(featuredComic.id)} className="catalog-primary-action">
                <BookOpen /> {featuredComic.progress?.percentage ? "Continuar leitura" : "Ler agora"}
              </button>
              <button onClick={() => setSelectedComic(featuredComic)} className="catalog-secondary-action">
                <Info /> Detalhes
              </button>
              {onOpenGuide && <button onClick={onOpenGuide} className="catalog-secondary-action"><Compass /> Por onde começar?</button>}
            </div>
          </div>
          <div className="catalog-hero-flow-slot"><CoverFlow items={featuredCandidates.map((comic) => ({ id: comic.id, title: comic.title, image: comic.coverUrl, subtitle: `${comic.year} · ${comic.totalPages} páginas` }))} activeIndex={featuredIndex} onChange={setFeaturedIndex} onActivate={(item) => setSelectedComic(featuredCandidates.find((comic) => comic.id === item.id) || null)} label="HQs recomendadas" /></div>
        </section>
      )}

      {!searchQuery && <RecommendationRoulette comics={allComics} onOpenReader={onOpenReader} onOpenDetails={setSelectedComic} />}
      {!searchQuery && <ReadingInsights comics={allComics} />}
      {!searchQuery && <ComicsNews />}

      {!searchQuery && launches.length > 0 && <section className="streaming-section" aria-labelledby="launches-2026-title"><div className="flex flex-wrap items-center justify-between gap-2 mb-4"><div><span className="text-[11px] font-black tracking-[.2em] text-amber-300">2026 EDITION</span><h2 id="launches-2026-title" className="streaming-heading">Destaques 2026</h2></div><a href="/lancamentos" className="text-xs text-amber-300 hover:underline">Ver todos →</a></div><div className="streaming-rail">{launches.map((comic) => <div key={comic.id} className="relative"><span className="absolute z-10 top-2 left-2 rounded bg-[#b91c1c] px-2 py-1 text-[9px] font-bold text-white">RECÉM-CHEGADO</span><ComicCard comic={comic} density="compact" onOpenReader={onOpenReader} onToggleFavorite={toggleFavorite} onOpenDetails={setSelectedComic} onOpenProgressModal={setComicForProgress} onMarkCompleted={(id, total) => setStatus(id, "completed", total)} onResetProgress={(id) => setStatus(id, "not_started", 10)} /></div>)}</div></section>}

      {!isLoading && allComics.length > 0 && (
        <div className="catalog-summary">
          <LibraryBig />
          <span><strong>{allComics.length}</strong> títulos no acervo</span>
          <span className="catalog-summary-dot" />
          <span>PDFs e capas protegidos no Cloudflare R2</span>
        </div>
      )}

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
              Catálogo completo
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Encontre sua próxima leitura por coleção, ano ou progresso
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
