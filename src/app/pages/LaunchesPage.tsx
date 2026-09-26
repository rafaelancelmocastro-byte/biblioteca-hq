import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, BookOpen, Calendar, Clock } from "lucide-react";
import { useLibrary } from "../../hooks/useLibrary";
import { CoverFlow } from "../../components/library/CoverFlow";
import { ComicCard } from "../../components/library/ComicCard";
import { ComicDetailModal } from "../../components/library/ComicDetailModal";
import { ProgressUpdateModal } from "../../components/library/ProgressUpdateModal";
import type { Comic } from "../../types/comic";

type LaunchView = "recent" | "year";
type LaunchSort = "recent" | "oldest" | "title" | "year_recent";

const RECENT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const RECENT_FALLBACK_COUNT = 24;
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

  const years = useMemo(
    () => [...new Set(allComics.map((comic) => comic.year).filter((value) => Number.isFinite(value) && value > 0))].sort((a, b) => b - a),
    [allComics]
  );
  const selectedYear = year && years.includes(year) ? year : years[0] || new Date().getFullYear();

  const recentComics = useMemo(() => {
    const ordered = [...allComics].sort((a, b) => addedTime(b) - addedTime(a) || b.year - a.year || a.title.localeCompare(b.title, "pt-BR"));
    const cutoff = Date.now() - RECENT_WINDOW_MS;
    const withinWindow = ordered.filter((comic) => addedTime(comic) >= cutoff);
    return withinWindow.length ? withinWindow : ordered.slice(0, RECENT_FALLBACK_COUNT);
  }, [allComics]);

  const filtered = useMemo(
    () => (view === "year" ? allComics.filter((comic) => comic.year === selectedYear) : recentComics),
    [allComics, recentComics, selectedYear, view]
  );

  const featured = useMemo(
    () => [...filtered].sort((a, b) => addedTime(b) - addedTime(a) || b.year - a.year || b.issueNumber - a.issueNumber).slice(0, 8),
    [filtered]
  );
  const selectedComic = featured[Math.min(active, Math.max(0, featured.length - 1))];

  const comics = useMemo(() => {
    const list = [...filtered];
    switch (sort) {
      case "oldest":
        return list.sort((a, b) => addedTime(a) - addedTime(b) || a.year - b.year || a.title.localeCompare(b.title, "pt-BR"));
      case "title":
        return list.sort((a, b) => a.title.localeCompare(b.title, "pt-BR") || a.issueNumber - b.issueNumber);
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
    setSort("recent");
  }, [view, selectedYear]);

  useEffect(() => {
    setVisibleCount(48);
  }, [sort]);

  return (
    <div className="streaming-page launches-page space-y-10 sm:space-y-12">
      {selectedComic && (
        <section className="relative overflow-hidden pt-2 pb-6" aria-label="Destaque de lançamentos">
          {selectedComic.coverUrl && (
            <div className="absolute inset-0 -z-10 overflow-hidden opacity-20 blur-3xl pointer-events-none">
              <img
                src={selectedComic.coverUrl}
                alt=""
                className="h-full w-full -translate-y-1/4 scale-150 object-cover"
                aria-hidden="true"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-[#05090f]/50 via-[#05090f]/80 to-[#05090f]" />
            </div>
          )}

          <div className="mx-auto w-full max-w-4xl px-2">
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

          <div className="mx-auto mt-5 max-w-xl px-4 text-center">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-400">
              {selectedComic.seriesTitle || "Edição especial"} · #{selectedComic.issueNumber}
            </span>
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">
              {selectedComic.title}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-neutral-400 sm:text-sm">
              <span>{selectedComic.year}</span>
              <span>·</span>
              <span className="min-w-0 break-words">{selectedComic.publisher}</span>
              <span>·</span>
              <span>{selectedComic.totalPages} páginas</span>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => onOpenReader(selectedComic.id)}
                className="flex h-11 max-w-full items-center justify-center gap-2 rounded-full bg-white px-6 text-xs font-semibold text-black shadow-lg transition-colors hover:bg-neutral-200 sm:px-7 sm:text-sm"
              >
                <BookOpen className="h-4 w-4 shrink-0" />
                <span>{(selectedComic.progress?.currentPage || 0) > 0 || (selectedComic.progress?.percentage || 0) > 0 ? "Retomar" : "Ler agora"}</span>
              </button>
              <button
                type="button"
                onClick={() => setDetail(selectedComic)}
                className="h-11 shrink-0 rounded-full border border-white/15 bg-white/5 px-5 text-xs font-medium text-white transition-colors hover:bg-white/10 sm:text-sm"
              >
                Detalhes
              </button>
            </div>
          </div>
        </section>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-neutral-900/40 p-2 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:p-3">
        <div className="grid w-full grid-cols-2 gap-1 rounded-xl border border-white/10 bg-white/[0.05] p-1 sm:w-auto" role="tablist" aria-label="Tipo de lançamentos">
          <button
            type="button"
            role="tab"
            aria-selected={view === "recent"}
            onClick={() => setView("recent")}
            className={`flex min-h-9 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 text-[11px] font-semibold transition-all sm:px-4 sm:text-xs ${view === "recent" ? "bg-white font-bold text-black shadow-md" : "text-neutral-400 hover:text-neutral-200"}`}
          >
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0">Recém-adicionadas</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "year"}
            disabled={!years.length}
            onClick={() => setView("year")}
            className={`flex min-h-9 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 text-[11px] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40 sm:px-4 sm:text-xs ${view === "year" ? "bg-white font-bold text-black shadow-md" : "text-neutral-400 hover:text-neutral-200"}`}
          >
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>Por ano</span>
          </button>
        </div>

        {view === "year" && selectedYear && (
          <label className="flex w-full items-center gap-2 text-xs font-medium text-neutral-400 sm:w-auto">
            <span className="shrink-0">Ano</span>
            <select
              value={selectedYear}
              onChange={(event) => setYear(Number(event.target.value))}
              aria-label="Selecionar ano de publicação"
              className="h-9 min-w-0 flex-1 rounded-xl border border-white/10 bg-neutral-900/90 px-3 text-xs text-white outline-none transition-colors focus:border-white/30 sm:w-36 sm:flex-none"
            >
              {years.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
        )}
      </div>

      {isLoading ? (
        <div className="empty-collection-kind" role="status">Carregando edições...</div>
      ) : comics.length ? (
        <section className="space-y-4 pt-1" aria-labelledby="launches-section-title">
          <div className="flex flex-col gap-3 border-b border-white/10 pb-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <h2 id="launches-section-title" className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                  {view === "year" ? `Publicações de ${selectedYear}` : "Novidades no acervo"}
                </h2>
                <span className="text-xs font-normal text-neutral-400 sm:text-sm">
                  · {comics.length} {comics.length === 1 ? "edição" : "edições"}
                </span>
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-neutral-400">
                {view === "year"
                  ? `Edições do acervo publicadas originalmente em ${selectedYear}`
                  : "HQs adicionadas nos últimos 30 dias; quando não há adições nesse período, mostramos as 24 mais recentes."}
              </p>
            </div>

            <label className="flex w-full items-center gap-2 text-xs font-medium text-neutral-400 sm:w-auto">
              <span className="flex shrink-0 items-center gap-1"><ArrowUpDown className="h-3.5 w-3.5" /> Ordenar</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as LaunchSort)}
                aria-label="Critério de ordenação"
                className="h-9 min-w-0 flex-1 rounded-xl border border-white/10 bg-neutral-900/90 px-3 text-xs text-white outline-none transition-colors focus:border-white/30 sm:w-44 sm:flex-none"
              >
                <option value="recent">Mais recentes</option>
                <option value="oldest">Mais antigos</option>
                <option value="title">Título A–Z</option>
                {view !== "year" && <option value="year_recent">Ano mais recente</option>}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
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
                className="min-h-11 max-w-full rounded-xl border border-white/15 bg-white/5 px-6 text-xs font-medium text-white transition-colors hover:bg-white/10 sm:text-sm"
                onClick={() => setVisibleCount((count) => count + 48)}
              >
                Mostrar mais edições ({comics.length - visibleCount} restantes)
              </button>
            </div>
          )}
        </section>
      ) : (
        <div className="empty-collection-kind">
          {view === "year" ? `Nenhuma edição cadastrada para ${selectedYear}.` : "Nenhuma adição recente encontrada no acervo."}
        </div>
      )}

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
      <ProgressUpdateModal comic={progress} isOpen={!!progress} onClose={() => setProgress(null)} onSaveProgress={updateProgress} />
    </div>
  );
}
