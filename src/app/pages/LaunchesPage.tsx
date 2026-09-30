import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, BookOpen, Clock3, Sparkles } from "lucide-react";
import { useLibrary } from "../../hooks/useLibrary";
import { CoverFlow } from "../../components/library/CoverFlow";
import { ComicCard } from "../../components/library/ComicCard";
import { ComicDetailModal } from "../../components/library/ComicDetailModal";
import { ProgressUpdateModal } from "../../components/library/ProgressUpdateModal";
import type { Comic } from "../../types/comic";

type LaunchSort = "recent" | "title" | "year_recent";

const CURRENT_YEAR = new Date().getFullYear();
const RECENT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const RECENT_FALLBACK_COUNT = 24;
const SECTION_LIMIT = 18;

const addedTime = (comic: Comic) => new Date(comic.addedAt).getTime() || 0;
const sortByAdded = (a: Comic, b: Comic) =>
  addedTime(b) - addedTime(a) || b.year - a.year || a.title.localeCompare(b.title, "pt-BR");

export function LaunchesPage({ onOpenReader }: { onOpenReader: (id: string) => void }) {
  const { allComics, toggleFavorite, updateProgress, setStatus, isLoading, ensureCoverUrls } = useLibrary();
  const [sort, setSort] = useState<LaunchSort>("recent");
  const [visibleCount, setVisibleCount] = useState(48);
  const [active, setActive] = useState(0);
  const [detail, setDetail] = useState<Comic | null>(null);
  const [progress, setProgress] = useState<Comic | null>(null);

  const recentComics = useMemo(() => {
    const ordered = [...allComics].sort(sortByAdded);
    const cutoff = Date.now() - RECENT_WINDOW_MS;
    const withinWindow = ordered.filter((comic) => addedTime(comic) >= cutoff);
    return withinWindow.length ? withinWindow : ordered.slice(0, RECENT_FALLBACK_COUNT);
  }, [allComics]);

  const featured = useMemo(() => recentComics.slice(0, 8), [recentComics]);
  const selectedComic = featured[Math.min(active, Math.max(0, featured.length - 1))];

  const recentLaunches = useMemo(
    () =>
      allComics
        .filter((comic) => comic.year >= CURRENT_YEAR - 1 && comic.year <= CURRENT_YEAR)
        .sort((a, b) => b.year - a.year || addedTime(b) - addedTime(a) || b.issueNumber - a.issueNumber),
    [allComics]
  );

  const recentClassics = useMemo(
    () => recentComics.filter((comic) => comic.year > 0 && comic.year < CURRENT_YEAR - 1).sort(sortByAdded),
    [recentComics]
  );

  const sortedRecent = useMemo(() => {
    const list = [...recentComics];
    if (sort === "title") return list.sort((a, b) => a.title.localeCompare(b.title, "pt-BR") || a.issueNumber - b.issueNumber);
    if (sort === "year_recent") return list.sort((a, b) => b.year - a.year || sortByAdded(a, b));
    return list.sort(sortByAdded);
  }, [recentComics, sort]);

  useEffect(() => {
    const targets = [...featured, ...recentLaunches.slice(0, SECTION_LIMIT), ...recentClassics.slice(0, SECTION_LIMIT)]
      .filter((comic, index, list) => !comic.coverUrl && list.findIndex((item) => item.id === comic.id) === index);
    if (targets.length) void ensureCoverUrls(targets);
  }, [featured, recentLaunches, recentClassics, ensureCoverUrls]);

  useEffect(() => {
    setActive(0);
  }, [featured.length]);

  useEffect(() => {
    setVisibleCount(48);
  }, [sort]);

  const renderCard = (comic: Comic) => (
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
  );

  return (
    <div className="streaming-page launches-page space-y-10 sm:space-y-12">
      <header className="px-1 pt-1">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">Descobrir</span>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">Novidades</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400 sm:text-base">
          Veja o que acabou de chegar à Biblioteca HQ, acompanhe publicações recentes e redescubra clássicos adicionados ao acervo.
        </p>
      </header>

      {selectedComic && (
        <section className="relative overflow-hidden pt-2 pb-6" aria-label="Novidades no acervo">
          {selectedComic.coverUrl && (
            <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden opacity-20 blur-3xl">
              <img src={selectedComic.coverUrl} alt="" className="h-full w-full -translate-y-1/4 scale-150 object-cover" aria-hidden="true" />
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
              label="Novidades no acervo"
            />
          </div>

          <div className="mx-auto mt-5 max-w-xl px-4 text-center">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Novo no acervo · {selectedComic.seriesTitle || "Edição especial"} · #{selectedComic.issueNumber}
            </span>
            <h2 className="text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">{selectedComic.title}</h2>
            <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-neutral-400 sm:text-sm">
              <span>{selectedComic.year}</span><span>·</span><span>{selectedComic.publisher}</span><span>·</span><span>{selectedComic.totalPages} páginas</span>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => onOpenReader(selectedComic.id)}
                className="flex h-11 items-center justify-center gap-2 rounded-full bg-white px-6 text-xs font-semibold text-black shadow-lg transition-colors hover:bg-neutral-200 sm:px-7 sm:text-sm"
              >
                <BookOpen className="h-4 w-4 shrink-0" />
                {(selectedComic.progress?.currentPage || 0) > 0 || (selectedComic.progress?.percentage || 0) > 0 ? "Retomar" : "Ler agora"}
              </button>
              <button
                type="button"
                onClick={() => setDetail(selectedComic)}
                className="h-11 rounded-full border border-white/15 bg-white/5 px-5 text-xs font-medium text-white transition-colors hover:bg-white/10 sm:text-sm"
              >
                Detalhes
              </button>
            </div>
          </div>
        </section>
      )}

      {isLoading ? (
        <div className="empty-collection-kind" role="status">Carregando novidades...</div>
      ) : (
        <>
          <section className="space-y-4" aria-labelledby="recently-added-title">
            <div className="flex flex-col gap-3 border-b border-white/10 pb-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="flex flex-wrap items-baseline gap-2">
                  <h2 id="recently-added-title" className="text-xl font-bold tracking-tight text-white sm:text-2xl">Adicionados recentemente</h2>
                  <span className="text-xs text-neutral-500">· {recentComics.length} {recentComics.length === 1 ? "edição" : "edições"}</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-neutral-400">
                  Entraram no acervo recentemente, independentemente do ano original de publicação.
                </p>
              </div>

              <label className="flex w-full items-center gap-2 text-xs font-medium text-neutral-400 sm:w-auto">
                <span className="flex shrink-0 items-center gap-1"><ArrowUpDown className="h-3.5 w-3.5" /> Ordenar</span>
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as LaunchSort)}
                  className="h-9 min-w-0 flex-1 rounded-xl border border-white/10 bg-neutral-900/90 px-3 text-xs text-white outline-none focus:border-white/30 sm:w-44 sm:flex-none"
                  aria-label="Ordenar novidades"
                >
                  <option value="recent">Mais recentes</option>
                  <option value="title">Título A–Z</option>
                  <option value="year_recent">Ano mais recente</option>
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
              {sortedRecent.slice(0, visibleCount).map(renderCard)}
            </div>

            {visibleCount < sortedRecent.length && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  className="min-h-11 rounded-xl border border-white/15 bg-white/5 px-6 text-xs font-medium text-white transition-colors hover:bg-white/10 sm:text-sm"
                  onClick={() => setVisibleCount((count) => count + 48)}
                >
                  Mostrar mais ({sortedRecent.length - visibleCount} restantes)
                </button>
              </div>
            )}
          </section>

          {!!recentLaunches.length && (
            <section className="space-y-4" aria-labelledby="recent-launches-title">
              <div className="border-b border-white/10 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Sparkles className="h-4 w-4 text-sky-300" />
                  <h2 id="recent-launches-title" className="text-xl font-bold tracking-tight text-white sm:text-2xl">Lançamentos recentes</h2>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-neutral-400">Títulos publicados originalmente em {CURRENT_YEAR} e {CURRENT_YEAR - 1}.</p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
                {recentLaunches.slice(0, SECTION_LIMIT).map(renderCard)}
              </div>
            </section>
          )}

          {!!recentClassics.length && (
            <section className="space-y-4" aria-labelledby="classic-arrivals-title">
              <div className="border-b border-white/10 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Clock3 className="h-4 w-4 text-amber-300" />
                  <h2 id="classic-arrivals-title" className="text-xl font-bold tracking-tight text-white sm:text-2xl">Clássicos que chegaram ao acervo</h2>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-neutral-400">Obras de anos anteriores que foram adicionadas recentemente à Biblioteca HQ.</p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
                {recentClassics.slice(0, SECTION_LIMIT).map(renderCard)}
              </div>
            </section>
          )}

          {!recentComics.length && !recentLaunches.length && <div className="empty-collection-kind">Nenhuma novidade encontrada no acervo.</div>}
        </>
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
