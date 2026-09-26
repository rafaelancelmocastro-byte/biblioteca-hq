import React, { useMemo, useRef, useState } from "react";
import { ArrowRight, BookOpen, Search } from "lucide-react";
import { useLibrary } from "../../hooks/useLibrary";
import type { Comic } from "../../types/comic";
import { matchesComicSearch } from "../../lib/librarySearch";

const fold = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
const orderIssues = (a: Comic, b: Comic) =>
  (a.volume || 0) - (b.volume || 0) || a.issueNumber - b.issueNumber || a.year - b.year;

export const ReadingGuidePage: React.FC<{ onOpenReader: (id: string) => void }> = ({ onOpenReader }) => {
  const { allComics, seriesList, isLoading } = useLibrary();
  const [query, setQuery] = useState("");
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const detailRef = useRef<HTMLElement | null>(null);
  const needle = fold(query.trim());

  const paths = useMemo(
    () =>
      seriesList
        .map((series) => {
          const issues = allComics.filter((comic) => comic.seriesId === series.id).sort(orderIssues);
          return {
            series,
            issues,
            next: issues.find((comic) => comic.progress?.status !== "completed") || issues[0],
          };
        })
        .filter((path) => path.issues.length)
        .sort((a, b) => a.series.title.localeCompare(b.series.title, "pt-BR")),
    [allComics, seriesList]
  );

  const filteredPaths = useMemo(
    () =>
      paths
        .filter(
          (path) =>
            !needle ||
            [path.series.title, path.series.publisher].some((value) => fold(value).includes(needle)) ||
            path.issues.some((comic) => matchesComicSearch(comic, query))
        )
        .sort(
          (a, b) =>
            Number(fold(b.series.title).includes(needle)) -
              Number(fold(a.series.title).includes(needle)) ||
            a.series.title.localeCompare(b.series.title, "pt-BR")
        ),
    [needle, paths, query]
  );

  const selected = paths.find((path) => path.series.id === selectedSeriesId) || filteredPaths[0];

  const openPath = (id: string) => {
    setSelectedSeriesId(id);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      window.requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  };

  const related = selected
    ? paths.filter(
        (path) =>
          path.series.id !== selected.series.id &&
          (path.series.id === selected.series.parentSeriesId ||
            path.series.parentSeriesId === selected.series.id ||
            (!!selected.series.parentSeriesId &&
              path.series.parentSeriesId === selected.series.parentSeriesId))
      )
    : [];

  return (
    <div className="streaming-page reading-guide-page space-y-8 sm:space-y-10">
      <header className="px-1 pt-1">
        <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-400">Guia de leitura</span>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">Por onde começar?</h1>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-neutral-400 sm:text-sm">
          Encontre uma coleção, veja a sequência das edições e escolha o caminho que faz sentido para você.
        </p>
      </header>

      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3 sm:p-4" aria-label="Encontrar caminho de leitura">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <label htmlFor="guide-search" className="block min-w-0 flex-1">
            <span className="mb-1.5 block text-[11px] font-semibold text-neutral-400">O que você quer ler?</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <input
                id="guide-search"
                type="search"
                placeholder="Ex.: Superman, X-Men, Action Comics..."
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSelectedSeriesId(null);
                }}
                className="h-10 w-full rounded-xl border border-white/10 bg-[#090d13] pl-9 pr-3 text-xs text-white outline-none transition-colors placeholder:text-neutral-600 focus:border-white/30"
              />
            </span>
          </label>
          {!isLoading && (
            <span className="shrink-0 text-xs text-neutral-400">
              {filteredPaths.length} {filteredPaths.length === 1 ? "caminho" : "caminhos"}
            </span>
          )}
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">
          As edições seguem a ordem editorial. O ano de publicação não define sozinho a cronologia da história.
        </p>
      </section>

      {isLoading ? (
        <div className="empty-collection-kind" role="status">Carregando caminhos de leitura...</div>
      ) : !filteredPaths.length && !selectedSeriesId ? (
        <div className="empty-collection-kind">
          <BookOpen />
          <h2>Nenhum caminho encontrado</h2>
          <p>Tente buscar pelo nome da coleção, personagem ou editora.</p>
        </div>
      ) : (
        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(15rem,0.72fr)_minmax(0,1.5fr)]">
          <section className="min-w-0" aria-labelledby="guide-paths-title">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 px-1">
              <h2 id="guide-paths-title" className="text-lg font-bold tracking-tight text-white sm:text-xl">Caminhos de leitura</h2>
              <span className="text-xs text-neutral-500">{filteredPaths.length}</span>
            </div>

            <div className="grid max-h-[22rem] gap-2 overflow-y-auto pr-1 sm:max-h-[26rem] lg:max-h-[44rem]">
              {filteredPaths.map(({ series, issues, next }) => {
                const isActive = selected?.series.id === series.id;
                return (
                  <button
                    type="button"
                    key={series.id}
                    aria-pressed={isActive}
                    onClick={() => openPath(series.id)}
                    className={`grid min-w-0 grid-cols-[3rem_minmax(0,1fr)_1rem] items-center gap-3 rounded-xl border p-2.5 text-left transition-colors sm:grid-cols-[3.5rem_minmax(0,1fr)_1rem] sm:p-3 ${
                      isActive
                        ? "border-white/20 bg-white/[0.08]"
                        : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.045]"
                    }`}
                  >
                    <div className="aspect-[2/3] overflow-hidden rounded-md bg-neutral-900">
                      {issues[0].coverUrl ? (
                        <img src={issues[0].coverUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                      ) : null}
                    </div>
                    <span className="min-w-0">
                      <small className="block truncate text-[10px] uppercase tracking-wide text-neutral-500">
                        {series.publisher} · {issues.length} {issues.length === 1 ? "edição" : "edições"}
                      </small>
                      <strong className="mt-0.5 block truncate text-xs font-semibold text-white sm:text-sm">{series.title}</strong>
                      <em className="mt-1 block truncate text-[10.5px] not-italic text-neutral-500">
                        Primeira #{issues[0].issueNumber}
                        {next && next.id !== issues[0].id ? ` · Retome na #${next.issueNumber}` : ""}
                      </em>
                    </span>
                    <ArrowRight className="h-4 w-4 text-neutral-600" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </section>

          {selected && (
            <section ref={detailRef} className="min-w-0 scroll-mt-24 space-y-5">
              <div className="border-b border-white/[0.08] px-1 pb-4">
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-400">Sua trilha</span>
                <h2 className="mt-1 break-words text-2xl font-bold tracking-tight text-white sm:text-3xl">{selected.series.title}</h2>
                <p className="mt-2 max-w-3xl text-xs leading-relaxed text-neutral-400 sm:text-sm">
                  {selected.series.description ||
                    `Estas são as ${selected.issues.length} edições disponíveis desta coleção em sequência editorial.`}
                </p>
              </div>

              {related.length > 0 && (
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 sm:p-4">
                  <h3 className="text-sm font-semibold text-white">Histórias relacionadas</h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">
                    Conexões sugeridas para explorar o mesmo universo, sem tratá-las como pré-requisito.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {related.slice(0, 8).map((path) => (
                      <button
                        type="button"
                        key={path.series.id}
                        onClick={() => openPath(path.series.id)}
                        className="inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 text-[11px] text-neutral-300 hover:bg-white/[0.06]"
                      >
                        <span className="truncate">{path.series.title}</span>
                        <ArrowRight className="h-3 w-3 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3 sm:grid-cols-[6rem_minmax(0,1fr)] sm:items-center sm:p-4">
                <div className="mx-auto w-24 overflow-hidden rounded-lg bg-neutral-900 shadow-lg sm:mx-0 sm:w-full">
                  <div className="aspect-[2/3]">
                    {selected.issues[0].coverUrl ? (
                      <img src={selected.issues[0].coverUrl} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                </div>
                <div className="min-w-0 text-center sm:text-left">
                  <small className="text-[10.5px] font-semibold uppercase tracking-wide text-neutral-500">Primeira edição desta coleção</small>
                  <strong className="mt-1 block break-words text-sm font-semibold text-white sm:text-base">
                    {selected.issues[0].title} · #{selected.issues[0].issueNumber}
                  </strong>
                  <p className="mt-1 text-xs leading-relaxed text-neutral-400">
                    Comece pelo início, retome de onde parou ou abra qualquer edição abaixo.
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <button
                      type="button"
                      className="catalog-primary-action w-full sm:w-auto"
                      onClick={() => onOpenReader(selected.issues[0].id)}
                    >
                      <BookOpen /> Ler primeira edição
                    </button>
                    {selected.next && selected.next.id !== selected.issues[0].id && (
                      <button
                        type="button"
                        className="catalog-secondary-action w-full sm:w-auto"
                        onClick={() => onOpenReader(selected.next.id)}
                      >
                        Retomar na #{selected.next.issueNumber}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 px-1">
                  <h3 className="text-lg font-bold tracking-tight text-white sm:text-xl">Edições em ordem</h3>
                  <span className="text-xs text-neutral-500">
                    {selected.issues.length} {selected.issues.length === 1 ? "edição" : "edições"}
                  </span>
                </div>

                <ol className="grid gap-2">
                  {selected.issues.map((comic, index) => (
                    <li key={comic.id}>
                      <button
                        type="button"
                        onClick={() => onOpenReader(comic.id)}
                        className="grid w-full min-w-0 grid-cols-[2rem_2.8rem_minmax(0,1fr)_1rem] items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2 text-left transition-colors hover:bg-white/[0.045] sm:grid-cols-[2.25rem_3.2rem_minmax(0,1fr)_1rem] sm:gap-3 sm:p-2.5"
                      >
                        <span className="text-center text-[11px] font-semibold tabular-nums text-neutral-500">{index + 1}</span>
                        <div className="aspect-[2/3] overflow-hidden rounded bg-neutral-900">
                          {comic.coverUrl ? <img src={comic.coverUrl} alt="" className="h-full w-full object-cover" loading="lazy" /> : null}
                        </div>
                        <span className="min-w-0">
                          <strong className="block truncate text-xs font-semibold text-white sm:text-sm">{comic.title}</strong>
                          <small className="mt-0.5 block truncate text-[10px] text-neutral-500 sm:text-[10.5px]">
                            Edição #{comic.issueNumber} · {comic.year} · {comic.progress?.status === "completed" ? "Concluída" : comic.progress?.status === "reading" ? "Em leitura" : "Não iniciada"}
                          </small>
                        </span>
                        <ArrowRight className="h-4 w-4 text-neutral-600" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};
