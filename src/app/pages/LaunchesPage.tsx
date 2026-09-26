import { useEffect, useMemo, useState } from "react";
import { BookOpen, Sparkles, Calendar, Clock, ArrowUpDown } from "lucide-react";
import { useLibrary } from "../../hooks/useLibrary";
import { CoverFlow } from "../../components/library/CoverFlow";
import { ComicCard } from "../../components/library/ComicCard";
import { ComicDetailModal } from "../../components/library/ComicDetailModal";
import { ProgressUpdateModal } from "../../components/library/ProgressUpdateModal";
import type { Comic } from "../../types/comic";

type LaunchView = "recent" | "year";
type LaunchSort = "recent" | "oldest" | "title" | "year_recent";

const addedTime = (comic: Comic) => new Date(comic.addedAt).getTime() || 0;

export function LaunchesPage({ onOpenReader }: { onOpenReader: (id: string) => void }) {
  const { allComics, toggleFavorite, updateProgress, setStatus, isLoading } = useLibrary();
  const [view, setView] = useState<LaunchView>("recent");
  const [year, setYear] = useState<number | null>(null);
  const [sort, setSort] = useState<LaunchSort>("recent");
  const [visibleCount, setVisibleCount] = useState(48);
  const [active, setActive] = useState(0);
  const [detail, setDetail] = useState<Comic | null>(null);
  const [progress, setProgress] = useState<Comic | null>(null);

  // Lista de anos disponíveis ordenados decrescente
  const years = useMemo(
    () =>
      [...new Set(allComics.map((comic) => comic.year).filter((v) => Number.isFinite(v) && v > 0))].sort(
        (a, b) => b - a
      ),
    [allComics]
  );

  const selectedYear = year && years.includes(year) ? year : years[0] || new Date().getFullYear();

  // Filtragem conforme a visão ativa
  const filtered = useMemo(
    () => (view === "year" ? allComics.filter((comic) => comic.year === selectedYear) : allComics),
    [allComics, selectedYear, view]
  );

  // Destaques para o Hero Editorial (exatamente 8 edições mais recentes da visão)
  const featured = useMemo(() => {
    if (view === "year") {
      // 8 publicações mais recentes do ano selecionado
      return [...filtered]
        .sort((a, b) => addedTime(b) - addedTime(a) || (b.issueNumber || 0) - (a.issueNumber || 0))
        .slice(0, 8);
    }
    // 8 adições mais recentes à biblioteca
    return [...allComics]
      .sort((a, b) => addedTime(b) - addedTime(a) || b.year - a.year)
      .slice(0, 8);
  }, [allComics, filtered, view]);

  const selectedComic = featured[Math.min(active, Math.max(0, featured.length - 1))];

  // Ordenação da lista de HQs
  const comics = useMemo(() => {
    const list = [...filtered];
    switch (sort) {
      case "oldest":
        return list.sort((a, b) => addedTime(a) - addedTime(b) || a.year - b.year || a.title.localeCompare(b.title, "pt-BR"));
      case "title":
        return list.sort((a, b) => a.title.localeCompare(b.title, "pt-BR") || (a.issueNumber || 0) - (b.issueNumber || 0));
      case "year_recent":
        return list.sort((a, b) => b.year - a.year || addedTime(b) - addedTime(a) || a.title.localeCompare(b.title, "pt-BR"));
      case "recent":
      default:
        return list.sort((a, b) => addedTime(b) - addedTime(a) || b.year - a.year || a.title.localeCompare(b.title, "pt-BR"));
    }
  }, [filtered, sort]);

  useEffect(() => {
    setActive(0);
    setVisibleCount(48);
  }, [view, selectedYear]);

  useEffect(() => {
    setVisibleCount(48);
  }, [sort]);

  return (
    <div className="streaming-page launches-page space-y-8 sm:space-y-10">
      {/* 1. Hero Editorial (Mesma estrutura do Hero atual da Biblioteca) */}
      {selectedComic && (
        <section className="relative pt-2 pb-6 overflow-hidden" aria-label="Destaque de lançamentos">
          {/* Fundo suave com iluminação sutil baseada na capa ativa */}
          {selectedComic.coverUrl && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20 blur-3xl -z-10">
              <img
                src={selectedComic.coverUrl}
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
              items={featured.map((comic) => ({
                id: comic.id,
                title: comic.title,
                image: comic.coverUrl,
                subtitle: `${comic.seriesTitle || comic.title} #${comic.issueNumber}`,
              }))}
              activeIndex={active}
              onChange={setActive}
              onActivate={(item) => setDetail(featured.find((comic) => comic.id === item.id) || null)}
              label="Lançamentos em destaque"
            />
          </div>

          {/* Título, Metadados e CTAs Posicionados Abaixo do Carrossel */}
          <div className="text-center mt-5 max-w-xl mx-auto px-4">
            <span className="text-xs uppercase tracking-wider text-neutral-400 font-semibold block mb-1">
              {selectedComic.seriesTitle || "Edição Especial"} · #{selectedComic.issueNumber}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
              {selectedComic.title}
            </h1>
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm text-neutral-400 mt-1.5">
              <span>{selectedComic.year}</span>
              <span>·</span>
              <span>{selectedComic.publisher}</span>
              <span>·</span>
              <span>{selectedComic.totalPages} páginas</span>
            </div>

            {/* CTAs principais: Retomar/Ler agora e Detalhes */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
              <button
                type="button"
                onClick={() => onOpenReader(selectedComic.id)}
                className="h-11 px-6 sm:px-7 rounded-full bg-white text-black font-semibold text-xs sm:text-sm hover:bg-neutral-200 transition-colors shadow-lg cursor-pointer flex items-center justify-center gap-2 max-w-full"
              >
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>
                  {((selectedComic.progress?.currentPage || 0) > 0 || (selectedComic.progress?.percentage || 0) > 0)
                    ? "Retomar"
                    : "Ler agora"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setDetail(selectedComic)}
                className="h-11 px-5 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-white font-medium text-xs sm:text-sm transition-colors cursor-pointer shrink-0"
              >
                Detalhes
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 2. Navegação da Página (Segmented Control + Seletor de Ano) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 sm:p-3 rounded-2xl border border-white/10 bg-neutral-900/40 backdrop-blur-md">
        <div
          className="inline-flex p-1 rounded-xl bg-white/[0.05] border border-white/10 w-full sm:w-auto"
          role="tablist"
          aria-label="Tipo de lançamentos"
        >
          <button
            type="button"
            role="tab"
            aria-selected={view === "recent"}
            onClick={() => setView("recent")}
            className={`flex-1 sm:flex-initial h-9 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              view === "recent"
                ? "bg-white text-black shadow-md font-bold"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>Recém-adicionadas</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={view === "year"}
            disabled={!years.length}
            onClick={() => setView("year")}
            className={`flex-1 sm:flex-initial h-9 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              view === "year"
                ? "bg-white text-black shadow-md font-bold"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>Por ano</span>
          </button>
        </div>

        {/* Seletor de Ano no modo 'Por ano' */}
        {view === "year" && selectedYear && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-neutral-400 font-medium shrink-0">Ano:</span>
            <select
              value={selectedYear}
              onChange={(e) => setYear(Number(e.target.value))}
              aria-label="Selecionar ano de publicação"
              className="w-full sm:w-36 h-9 px-3 rounded-xl bg-neutral-900/90 text-xs text-white border border-white/10 focus:border-white/30 focus:outline-none cursor-pointer transition-colors"
            >
              {years.map((y) => (
                <option key={y} value={y} className="bg-[#121620]">
                  {y}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 3. Seção Principal de Listagem com Cabeçalho Contextual */}
      {isLoading ? (
        <div className="empty-collection-kind" role="status">
          Carregando edições...
        </div>
      ) : comics.length ? (
        <section className="space-y-4 pt-1" aria-labelledby="launches-section-title">
          {/* Cabeçalho da Grade Contextual */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-1 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <h2 id="launches-section-title" className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {view === "year" ? `Publicações de ${selectedYear}` : "Novidades no acervo"}
                </h2>
                <span className="text-xs sm:text-sm text-neutral-400 font-normal">
                  · {comics.length} {comics.length === 1 ? "edição" : "edições"}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {view === "year"
                  ? `Edições do acervo lançadas originalmente no ano de ${selectedYear}`
                  : "Adições recentes à sua biblioteca"}
              </p>
            </div>

            {/* Ordenação */}
            <div className="flex items-center gap-2 self-start sm:self-auto w-full sm:w-auto">
              <span className="text-xs text-neutral-400 font-medium shrink-0 flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5" /> Ordenar
              </span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as LaunchSort)}
                aria-label="Critério de ordenação"
                className="w-full sm:w-44 h-9 px-3 rounded-xl bg-neutral-900/90 text-xs text-white border border-white/10 focus:border-white/30 focus:outline-none cursor-pointer transition-colors"
              >
                <option value="recent" className="bg-[#121620]">Mais recentes</option>
                <option value="oldest" className="bg-[#121620]">Mais antigos</option>
                <option value="title" className="bg-[#121620]">Título A–Z</option>
                {view !== "year" && (
                  <option value="year_recent" className="bg-[#121620]">Ano mais recente</option>
                )}
              </select>
            </div>
          </div>

          {/* 4. Grade de Cards Fluida (Breakpoints idênticos à Biblioteca) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 pt-2">
            {comics.slice(0, visibleCount).map((comic) => (
              <ComicCard
                key={comic.id}
                comic={comic}
                density="compact"
                onOpenReader={onOpenReader}
                onToggleFavorite={toggleFavorite}
                onOpenDetails={setDetail}
                onOpenProgressModal={setProgress}
                onMarkCompleted={(id, total) => setStatus(id, "completed", total)}
                onResetProgress={(id) => setStatus(id, "not_started", 10)}
              />
            ))}
          </div>

          {visibleCount < comics.length && (
            <div className="pt-4 text-center">
              <button
                type="button"
                className="h-11 px-6 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white font-medium text-xs sm:text-sm transition-colors cursor-pointer"
                onClick={() => setVisibleCount((count) => count + 48)}
              >
                Mostrar mais edições ({comics.length - visibleCount} restantes)
              </button>
            </div>
          )}
        </section>
      ) : (
        <div className="empty-collection-kind">
          {view === "year"
            ? `Nenhuma edição cadastrada para o ano ${selectedYear}.`
            : "Ainda não há edições cadastradas no acervo."}
        </div>
      )}

      {/* Modais Compartilhados */}
      <ComicDetailModal
        comic={detail}
        isOpen={!!detail}
        onClose={() => setDetail(null)}
        onOpenReader={onOpenReader}
        onToggleFavorite={toggleFavorite}
        onOpenProgressModal={setProgress}
        onMarkCompleted={(id, total) => setStatus(id, "completed", total)}
        onResetProgress={(id) => setStatus(id, "not_started", 10)}
      />

      <ProgressUpdateModal
        comic={progress}
        isOpen={!!progress}
        onClose={() => setProgress(null)}
        onSaveProgress={updateProgress}
      />
    </div>
  );
}
