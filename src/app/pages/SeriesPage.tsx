import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Heart, Search } from "lucide-react";
import { useLibrary } from "../../hooks/useLibrary";
import type { Comic } from "../../types/comic";
import { CoverFlow } from "../../components/library/CoverFlow";
import { ComicCard } from "../../components/library/ComicCard";
import { ComicDetailModal } from "../../components/library/ComicDetailModal";
import { ProgressUpdateModal } from "../../components/library/ProgressUpdateModal";
import { supabase } from "../../services/supabaseClient";
import { getAssetUrls, getCachedAssetUrls } from "../../services/assetUrls";

const slug = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const publisherArt = (name: string) =>
  /dc comics|^dc$/i.test(name)
    ? "/publisher-art/dc.png"
    : /marvel/i.test(name)
    ? "/publisher-art/marvel.png"
    : /jbc/i.test(name)
    ? "/publisher-art/jbc.png"
    : /new.?pop/i.test(name)
    ? "/publisher-art/newpop.png"
    : undefined;

const sagaArt = (name: string) => {
  const value = slug(name);
  return value.includes("batman")
    ? "/saga-art/batman.png"
    : value.includes("superman")
    ? "/saga-art/superman.png"
    : value.includes("x-men")
    ? "/saga-art/x-men.png"
    : value.includes("lanterna verde") || value.includes("green lantern")
    ? "/saga-art/green-lantern.png"
    : undefined;
};

let cachedPublisherKeys: Record<string, string> = {};
let rememberedView = {
  publisher: null as string | null,
  seriesId: null as string | null,
  kind: "all" as "all" | "collection" | "saga",
  groupSearch: "",
  issueSearch: "",
  issueStatus: "all",
  issueSort: "issue",
  activePublisher: 0,
  activeSeries: 0,
  activeSaga: 0,
  detail: null as Comic | null,
};

export const SeriesPage: React.FC<{ onOpenReader: (id: string) => void }> = ({ onOpenReader }) => {
  const {
    allComics,
    seriesList,
    favoriteSeriesIds,
    toggleFavorite,
    toggleSeriesFavorite,
    updateProgress,
    setStatus,
    isLoading,
  } = useLibrary();

  const [publisher, setPublisher] = useState<string | null>(rememberedView.publisher);
  const [seriesId, setSeriesId] = useState<string | null>(rememberedView.seriesId);
  const [kind, setKind] = useState<"all" | "collection" | "saga">(rememberedView.kind);
  const [groupSearch, setGroupSearch] = useState(rememberedView.groupSearch);
  const [issueSearch, setIssueSearch] = useState(rememberedView.issueSearch);
  const [issueStatus, setIssueStatus] = useState(rememberedView.issueStatus);
  const [issueSort, setIssueSort] = useState(rememberedView.issueSort);
  const [activePublisher, setActivePublisher] = useState(rememberedView.activePublisher);
  const [activeSeries, setActiveSeries] = useState(rememberedView.activeSeries);
  const [activeSaga, setActiveSaga] = useState(rememberedView.activeSaga);
  const [assetUrls, setAssetUrls] = useState<Record<string, string>>(() =>
    getCachedAssetUrls(Object.values(cachedPublisherKeys))
  );
  const [publisherKeys, setPublisherKeys] = useState<Record<string, string>>(() => cachedPublisherKeys);
  const [detail, setDetail] = useState<Comic | null>(rememberedView.detail);
  const [progress, setProgress] = useState<Comic | null>(null);
  const [favoriteError, setFavoriteError] = useState("");

  useEffect(() => {
    rememberedView = {
      publisher,
      seriesId,
      kind,
      groupSearch,
      issueSearch,
      issueStatus,
      issueSort,
      activePublisher,
      activeSeries,
      activeSaga,
      detail,
    };
  }, [
    publisher,
    seriesId,
    kind,
    groupSearch,
    issueSearch,
    issueStatus,
    issueSort,
    activePublisher,
    activeSeries,
    activeSaga,
    detail,
  ]);

  const seriesMounted = React.useRef(false);
  useEffect(() => {
    if (seriesMounted.current) setActiveSaga(0);
    else seriesMounted.current = true;
  }, [seriesId]);

  useEffect(() => {
    const requestedId = new URLSearchParams(window.location.search).get("series");
    const requested = seriesList.find((item) => item.id === requestedId);
    if (requested) {
      setPublisher(requested.publisher);
      setSeriesId(requested.id);
    }
  }, [seriesList]);

  const publishers = useMemo(
    () =>
      [...new Set([...seriesList.map((series) => series.publisher), ...Object.keys(publisherKeys)])].sort((a, b) =>
        a.localeCompare(b, "pt-BR")
      ),
    [seriesList, publisherKeys]
  );

  const groups = useMemo(() => {
    const needle = groupSearch.trim().toLocaleLowerCase("pt-BR");
    return seriesList.filter((series) => {
      if (series.publisher !== publisher || series.parentSeriesId) return false;
      if (kind !== "all" && (series.bannerTone === "saga" ? "saga" : "collection") !== kind) return false;
      if (!needle) return true;

      const childIds = seriesList.filter((child) => child.parentSeriesId === series.id).map((child) => child.id);
      const childTitles = seriesList
        .filter((child) => child.parentSeriesId === series.id)
        .map((child) => child.title)
        .join(" ");
      const relatedComics = allComics
        .filter((comic) => comic.seriesId === series.id || childIds.includes(comic.seriesId))
        .map((comic) => `${comic.title} ${comic.characters.join(" ")}`)
        .join(" ");

      return `${series.title} ${childTitles} ${relatedComics}`.toLocaleLowerCase("pt-BR").includes(needle);
    });
  }, [seriesList, allComics, publisher, kind, groupSearch]);

  const activeGroup = groups[Math.min(activeSeries, groups.length - 1)];
  const selectedSeries = seriesList.find((series) => series.id === seriesId);
  const parentSeries = selectedSeries?.parentSeriesId
    ? seriesList.find((series) => series.id === selectedSeries.parentSeriesId)
    : null;
  const childSagas = useMemo(
    () => seriesList.filter((series) => series.parentSeriesId === seriesId),
    [seriesList, seriesId]
  );

  const issues = useMemo(
    () =>
      allComics
        .filter((comic) => comic.seriesId === seriesId)
        .sort(
          (a, b) =>
            (a.volume || 0) - (b.volume || 0) || a.issueNumber - b.issueNumber || a.year - b.year
        ),
    [allComics, seriesId]
  );

  const visibleIssues = useMemo(
    () =>
      issues
        .filter(
          (comic) =>
            `${comic.title} ${comic.issueNumber} ${comic.characters.join(" ")}`
              .toLocaleLowerCase("pt-BR")
              .includes(issueSearch.toLocaleLowerCase("pt-BR")) &&
            (issueStatus === "all" || (comic.progress?.status || "not_started") === issueStatus)
        )
        .sort((a, b) =>
          issueSort === "recent"
            ? b.year - a.year || b.issueNumber - a.issueNumber
            : issueSort === "title"
            ? a.title.localeCompare(b.title, "pt-BR")
            : (a.volume || 0) - (b.volume || 0) || a.issueNumber - b.issueNumber
        ),
    [issues, issueSearch, issueStatus, issueSort]
  );

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    void supabase
      .from("publisher_assets")
      .select("publisher,logo_key")
      .then(({ data }) => {
        const keys = Object.fromEntries((data || []).map((row) => [row.publisher, row.logo_key]));
        if (alive) {
          cachedPublisherKeys = keys;
          setPublisherKeys(keys);
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const keys = [...seriesList.map((item) => item.coverKey), ...Object.values(publisherKeys)].filter(
      (key): key is string => !!key
    );
    if (!keys.length) return;
    setAssetUrls((current) => ({ ...current, ...getCachedAssetUrls(keys) }));
    let alive = true;
    void getAssetUrls(keys).then((urls) => {
      if (alive) setAssetUrls((current) => ({ ...current, ...urls }));
    });
    return () => {
      alive = false;
    };
  }, [seriesList, publisherKeys]);

  const publisherItems = publishers.map((name) => ({
    id: name,
    title: name,
    subtitle: `${allComics.filter((comic) => comic.publisher === name).length} edições`,
    image: publisherKeys[name]
      ? assetUrls[publisherKeys[name]]
      : publisherArt(name) || allComics.find((comic) => comic.publisher === name)?.coverUrl,
  }));

  const issueCount = (id: string) =>
    allComics.filter(
      (comic) =>
        comic.seriesId === id ||
        seriesList.some((series) => series.id === comic.seriesId && series.parentSeriesId === id)
    ).length;

  const editionCover = (id: string) =>
    allComics
      .filter(
        (comic) =>
          !!comic.coverUrl &&
          (comic.seriesId === id ||
            seriesList.some((series) => series.id === comic.seriesId && series.parentSeriesId === id))
      )
      .sort(
        (a, b) =>
          a.year - b.year || (a.volume || 0) - (b.volume || 0) || a.issueNumber - b.issueNumber
      )[0]?.coverUrl;

  const seriesItems = groups.map((group) => ({
    id: group.id,
    title: group.title,
    subtitle: `${favoriteSeriesIds.has(group.id) ? "♥ Favorita · " : ""}${issueCount(group.id)} edições · ${
      group.bannerTone === "saga" ? "Saga" : "Coleção"
    }`,
    image: group.coverKey ? assetUrls[group.coverKey] : editionCover(group.id) || sagaArt(group.title),
  }));

  const sagaItems = childSagas.map((saga) => ({
    id: saga.id,
    title: saga.title,
    subtitle: `${favoriteSeriesIds.has(saga.id) ? "♥ Favorita · " : ""}${issueCount(saga.id)} edições · ${
      saga.bannerTone === "one_shot" ? "Obra fechada" : saga.bannerTone === "phase" ? "Fase" : "Saga"
    }`,
    image: saga.coverKey ? assetUrls[saga.coverKey] : editionCover(saga.id),
  }));

  const favoriteButton = (series: typeof selectedSeries) =>
    series && (
      <button
        type="button"
        className={`min-h-10 sm:min-h-11 w-full sm:w-auto px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-center leading-tight flex items-center justify-center gap-2 border transition-all cursor-pointer active:scale-[0.98] ${
          favoriteSeriesIds.has(series.id)
            ? "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm"
            : "bg-white/[0.06] hover:bg-white/[0.12] text-neutral-200 border-white/10 hover:border-white/20"
        }`}
        aria-pressed={favoriteSeriesIds.has(series.id)}
        onClick={() => {
          setFavoriteError("");
          void toggleSeriesFavorite(series.id).catch(() =>
            setFavoriteError("Não foi possível salvar o favorito. Tente novamente.")
          );
        }}
      >
        <Heart
          className={`w-4 h-4 shrink-0 ${favoriteSeriesIds.has(series.id) ? "fill-current text-rose-400" : "text-neutral-400"}`}
        />
        <span>
          {favoriteSeriesIds.has(series.id)
            ? "Remover dos favoritos"
            : `Favoritar ${
                series.bannerTone === "saga"
                  ? "saga"
                  : series.bannerTone === "phase"
                  ? "fase"
                  : series.bannerTone === "one_shot"
                  ? "obra"
                  : "coleção"
              }`}
        </span>
      </button>
    );

  const goPublishers = () => {
    setPublisher(null);
    setSeriesId(null);
    setActiveSeries(0);
  };

  return (
    <div className="streaming-page series-page space-y-6 sm:space-y-8">
      <header className="px-1 pt-1">
        <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-400">Universos do acervo</span>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">Coleções e sagas</h1>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-neutral-400 sm:text-sm">
          Escolha uma editora, encontre uma coleção, saga ou fase e explore suas edições em ordem cronológica.
        </p>
      </header>

      {favoriteError && (
        <p role="alert" className="text-xs text-rose-400 px-1">
          {favoriteError}
        </p>
      )}

      <nav aria-label="Caminho da coleção" className="overflow-x-auto px-1 pb-1">
        <div className="flex w-max max-w-none items-center gap-2 whitespace-nowrap text-xs font-medium text-neutral-400">
          <button type="button" className="text-neutral-300 transition-colors hover:text-white" onClick={goPublishers}>Editoras</button>
          {publisher && (
            <>
              <span className="text-neutral-600">›</span>
              <button
                type="button"
                className={`max-w-[13rem] truncate transition-colors ${seriesId ? "text-neutral-300 hover:text-white" : "font-semibold text-white"}`}
                onClick={() => setSeriesId(null)}
                title={publisher}
              >
                {publisher}
              </button>
            </>
          )}
          {parentSeries && (
            <>
              <span className="text-neutral-600">›</span>
              <button
                type="button"
                className="max-w-[13rem] truncate text-neutral-300 transition-colors hover:text-white"
                onClick={() => setSeriesId(parentSeries.id)}
                title={parentSeries.title}
              >
                {parentSeries.title}
              </button>
            </>
          )}
          {selectedSeries && (
            <>
              <span className="text-neutral-600">›</span>
              <span className="max-w-[15rem] truncate font-semibold text-white" title={selectedSeries.title}>{selectedSeries.title}</span>
            </>
          )}
        </div>
      </nav>

      {isLoading ? (
        <div className="empty-collection-kind">Carregando coleções...</div>
      ) : selectedSeries ? (
        <section className="collection-open space-y-6" key={selectedSeries.id}>
          {/* Voltar às coleções */}
          <button
            type="button"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-neutral-300 hover:text-white transition-colors cursor-pointer py-1"
            onClick={() => setSeriesId(parentSeries?.id || null)}
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>{parentSeries ? `Voltar a ${parentSeries.title}` : "Voltar às coleções"}</span>
          </button>

          <div className="flex flex-col gap-4 border-b border-white/10 px-1 pb-5 sm:pb-6 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0 max-w-3xl">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                {selectedSeries.publisher} · {selectedSeries.startYear} · {issueCount(selectedSeries.id)} edições
              </span>
              <h2 className="mt-1 break-words text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">
                {selectedSeries.title}
              </h2>
              {selectedSeries.description && (
                <p className="mt-2 text-xs font-normal leading-relaxed text-neutral-300 sm:text-sm">
                  {selectedSeries.description}
                </p>
              )}
            </div>
            <div className="w-full md:w-auto">{favoriteButton(selectedSeries)}</div>
          </div>

          {childSagas.length > 0 && (
            <section className="space-y-4" aria-label={`Fases, sagas e obras fechadas de ${selectedSeries.title}`}>
              <div className="px-1">
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-400">Fases, sagas e obras fechadas</span>
              </div>
              <div className="mx-auto w-full max-w-4xl px-2">
                <CoverFlow
                  items={sagaItems}
                  activeIndex={activeSaga}
                  onChange={setActiveSaga}
                  onActivate={(item) => setSeriesId(item.id)}
                  label={`Fases, sagas e obras fechadas de ${selectedSeries.title}`}
                />
              </div>
              {childSagas[Math.min(activeSaga, childSagas.length - 1)] && (
                <div className="mx-auto max-w-2xl px-2 text-center">
                  <h3 className="break-words text-xl font-bold tracking-tight text-white sm:text-2xl">
                    {childSagas[Math.min(activeSaga, childSagas.length - 1)]?.title}
                  </h3>
                  <p className="mt-1 text-xs text-neutral-400 sm:text-sm">{sagaItems[activeSaga]?.subtitle}</p>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
                    {favoriteButton(childSagas[Math.min(activeSaga, childSagas.length - 1)])}
                    <button
                      type="button"
                      className="catalog-primary-action w-full sm:w-auto"
                      onClick={() => setSeriesId(childSagas[Math.min(activeSaga, childSagas.length - 1)].id)}
                    >
                      Explorar título
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Barra de Filtros e Busca de Edições (Padrão Biblioteca) */}
          {issues.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex flex-col gap-1 px-1 xs:flex-row xs:items-baseline xs:justify-between">
                <h3 className="text-lg font-bold tracking-tight text-white sm:text-xl">
                  {childSagas.length ? "Edições da coleção principal" : "Edições disponíveis"}
                </h3>
                <span className="text-xs font-medium text-neutral-400">{visibleIssues.length} de {issues.length}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 p-3 sm:p-4 rounded-2xl border border-white/10 bg-neutral-900/40 backdrop-blur-md">
                {/* Busca rápida */}
                <div className="flex flex-col">
                  <label htmlFor="issue-search-input" className="text-[11px] font-medium text-neutral-400 mb-1">
                    Buscar edição
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                    <input
                      id="issue-search-input"
                      value={issueSearch}
                      onChange={(event) => setIssueSearch(event.target.value)}
                      placeholder="Título, número ou personagem"
                      className="w-full h-10 pl-9 pr-3 rounded-xl bg-neutral-900/90 text-xs text-white border border-white/10 focus:border-white/30 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Filtro de Leitura */}
                <div className="flex flex-col">
                  <label htmlFor="issue-status-select" className="text-[11px] font-medium text-neutral-400 mb-1">
                    Status de leitura
                  </label>
                  <select
                    id="issue-status-select"
                    value={issueStatus}
                    onChange={(event) => setIssueStatus(event.target.value)}
                    className="h-10 px-3 rounded-xl bg-neutral-900/90 text-xs text-white border border-white/10 focus:border-white/30 focus:outline-none cursor-pointer transition-colors"
                  >
                    <option value="all" className="bg-[#121620]">Todos os estados</option>
                    <option value="not_started" className="bg-[#121620]">Não iniciadas</option>
                    <option value="reading" className="bg-[#121620]">Em leitura</option>
                    <option value="completed" className="bg-[#121620]">Concluídas</option>
                  </select>
                </div>

                {/* Ordenação */}
                <div className="flex flex-col sm:col-span-2 lg:col-span-1">
                  <label htmlFor="issue-sort-select" className="text-[11px] font-medium text-neutral-400 mb-1">
                    Ordenar por
                  </label>
                  <select
                    id="issue-sort-select"
                    value={issueSort}
                    onChange={(event) => setIssueSort(event.target.value)}
                    className="h-10 px-3 rounded-xl bg-neutral-900/90 text-xs text-white border border-white/10 focus:border-white/30 focus:outline-none cursor-pointer transition-colors"
                  >
                    <option value="issue" className="bg-[#121620]">Ordem da edição / cronológica</option>
                    <option value="recent" className="bg-[#121620]">Ano mais recente</option>
                    <option value="title" className="bg-[#121620]">Título A–Z</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Grade de HQs com ComicCard (Idêntica à Biblioteca) */}
          {visibleIssues.length ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 pt-1">
              {visibleIssues.map((comic) => (
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
          ) : (
            !childSagas.length && (
              <div className="empty-collection-kind">Nenhuma edição corresponde aos filtros aplicados.</div>
            )
          )}
        </section>
      ) : publisher ? (
        <section className="space-y-6">
          {/* Controles de Coleções da Editora */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-3 sm:p-4 rounded-2xl border border-white/10 bg-neutral-900/40 backdrop-blur-md">
            {/* Abas Segementadas estilo Biblioteca */}
            <div
              className="grid w-full grid-cols-3 gap-1 rounded-xl border border-white/10 bg-white/[0.05] p-1 md:w-auto"
              role="tablist"
              aria-label="Tipo de agrupamento"
            >
              {(["all", "collection", "saga"] as const).map((option) => {
                const count = seriesList.filter(
                  (series) =>
                    series.publisher === publisher &&
                    !series.parentSeriesId &&
                    (option === "all" || (series.bannerTone === "saga" ? "saga" : "collection") === option)
                ).length;
                const isActive = kind === option;
                return (
                  <button
                    key={option}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => {
                      setKind(option);
                      setActiveSeries(0);
                    }}
                    className={`flex min-h-9 min-w-0 items-center justify-center gap-1 rounded-lg px-2 text-[11px] font-semibold transition-all sm:px-3.5 sm:text-xs ${
                      isActive
                        ? "bg-white text-black shadow-md font-bold"
                        : "text-neutral-400 hover:text-neutral-200"
                    }`}
                  >
                    <span>{option === "all" ? "Todos" : option === "collection" ? "Coleções" : "Sagas"}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isActive ? "bg-black/15 text-black" : "bg-white/10 text-neutral-300"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Campo de Busca Rápida */}
            <div className="w-full md:w-72 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
              <input
                value={groupSearch}
                onChange={(event) => {
                  setGroupSearch(event.target.value);
                  setActiveSeries(0);
                }}
                placeholder="Filtrar por nome..."
                className="w-full h-10 pl-9 pr-3 rounded-xl bg-neutral-900/90 text-xs text-white border border-white/10 focus:border-white/30 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {groups.length ? (
            <section className="space-y-4" aria-label={`Franquias de ${publisher}`}>
              <div className="mx-auto w-full max-w-4xl px-2">
                <CoverFlow
                  items={seriesItems}
                  activeIndex={activeSeries}
                  onChange={setActiveSeries}
                  onActivate={(item) => setSeriesId(item.id)}
                  label={`Coleções de ${publisher}`}
                />
              </div>
              {activeGroup && (
                <div className="mx-auto max-w-2xl px-2 text-center">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">{publisher} · {activeGroup.startYear}</span>
                  <h2 className="mt-1 break-words text-2xl font-bold tracking-tight text-white sm:text-3xl">{activeGroup.title}</h2>
                  <p className="mx-auto mt-2 max-w-xl text-xs leading-relaxed text-neutral-400 sm:text-sm">
                    {activeGroup.description || "Explore as edições desta coleção."}
                  </p>
                  <p className="mt-1 text-xs text-neutral-400">{seriesItems[activeSeries]?.subtitle}</p>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
                    {favoriteButton(activeGroup)}
                    <button type="button" className="catalog-primary-action w-full sm:w-auto" onClick={() => setSeriesId(activeGroup.id)}>
                      Explorar edições
                    </button>
                  </div>
                </div>
              )}
            </section>
          ) : (
            <div className="empty-collection-kind">Nenhuma coleção deste tipo encontrada para {publisher}.</div>
          )}
        </section>
      ) : publishers.length ? (
        <section className="space-y-4" aria-label="Editoras e selos">
          <div className="mx-auto w-full max-w-4xl px-2">
            <CoverFlow
              items={publisherItems}
              activeIndex={activePublisher}
              onChange={setActivePublisher}
              onActivate={(item) => setPublisher(item.id)}
              label="Editoras do acervo"
            />
          </div>
          <div className="mx-auto max-w-xl px-2 text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Editora ou selo</span>
            <h2 className="mt-1 break-words text-2xl font-bold tracking-tight text-white sm:text-3xl">{publishers[activePublisher]}</h2>
            <p className="mt-1 text-xs text-neutral-400 sm:text-sm">{publisherItems[activePublisher]?.subtitle} no acervo</p>
            <button
              type="button"
              className="catalog-primary-action mt-4 w-full sm:w-auto"
              onClick={() => setPublisher(publishers[activePublisher])}
            >
              Explorar coleções
            </button>
          </div>
        </section>
      ) : (
        <div className="empty-collection-kind">Nenhuma coleção cadastrada.</div>
      )}

      {/* Modal de Detalhes da HQ */}
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

      {/* Modal de Ajuste de Progresso */}
      <ProgressUpdateModal
        comic={progress}
        isOpen={!!progress}
        onClose={() => setProgress(null)}
        onSaveProgress={updateProgress}
      />
    </div>
  );
};

