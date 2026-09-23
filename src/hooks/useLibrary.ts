import { useState, useEffect, useCallback, useMemo } from "react";
import { Comic, ComicStatus, LibraryFilters, Series, Character } from "../types/comic";
import { localFavoriteRepository } from "../services/localFavoriteRepository";
import { localProgressRepository } from "../services/localProgressRepository";
import { getCoverUrls, getSupabaseCatalog, invalidateCatalogCache } from "../services/supabaseCatalogRepository";
import { getLocalStorageItem, setLocalStorageItem } from "../lib/utils";
import { matchesComicSearch } from "../lib/librarySearch";
import {
  applySupabaseLibraryState,
  getSupabaseLibraryState,
  saveSupabaseProgress,
  setSupabaseProgressStatus,
  toggleSupabaseFavorite,
  toggleSupabaseSeriesFavorite,
} from "../services/supabaseLibrarySync";

const DENSITY_STORAGE_KEY = "biblioteca_hq_density";
const SERIES_FAVORITES_KEY = "biblioteca_hq_series_favorites_v1";

const DEFAULT_FILTERS: LibraryFilters = {
  searchQuery: "",
  series: "all",
  character: "all",
  publisher: "all",
  year: "all",
  status: "all",
  favoritesOnly: false,
  sortBy: "added_at_desc",
};

export function useLibrary() {
  const [allComics, setAllComics] = useState<Comic[]>([]);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [favoriteSeriesIds, setFavoriteSeriesIds] = useState<Set<string>>(new Set());
  const [charactersList, setCharactersList] = useState<Character[]>([]);
  const [publishers, setPublishers] = useState<string[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [filters, setFilters] = useState<LibraryFilters>(DEFAULT_FILTERS);
  const [gridDensity, setGridDensityState] = useState<"compact" | "comfortable">(() =>
    getLocalStorageItem<"compact" | "comfortable">(DENSITY_STORAGE_KEY, "comfortable")
  );

  const reloadData = useCallback(async (fresh = false) => {
    if (fresh) invalidateCatalogCache();
    setIsLoading(true);
    try {
      const [{ comics, series, characters, publishers: pubs, years: yrs }, remoteState] = await Promise.all([getSupabaseCatalog(), getSupabaseLibraryState()]);
      const hydrated = remoteState ? applySupabaseLibraryState(comics, remoteState) : comics;
      setAllComics(hydrated);
      setSeriesList(series);
      setFavoriteSeriesIds(remoteState?.favoriteSeriesIds ?? new Set(getLocalStorageItem<string[]>(SERIES_FAVORITES_KEY, [])));
      setCharactersList(characters);
      setPublishers(pubs);
      setYears(yrs);
      void getCoverUrls(hydrated).then((urls) => {
        setAllComics((current) => current.map((comic) => urls[comic.id] ? { ...comic, coverUrl: urls[comic.id] } : comic));
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadData();
  }, [reloadData]);

  const setGridDensity = useCallback((density: "compact" | "comfortable") => {
    setGridDensityState(density);
    setLocalStorageItem(DENSITY_STORAGE_KEY, density);
  }, []);

  const toggleFavorite = useCallback(async (comicId: string) => {
    const isFavorite = allComics.find((comic) => comic.id === comicId)?.isFavorite ?? false;
    const nextFavorite = !isFavorite;
    setAllComics((current) => current.map((comic) => comic.id === comicId ? { ...comic, isFavorite: nextFavorite } : comic));
    try {
      const savedRemotely = await toggleSupabaseFavorite(comicId, isFavorite);
      if (!savedRemotely) await localFavoriteRepository.toggleFavorite(comicId);
      return nextFavorite;
    } catch (error) {
      setAllComics((current) => current.map((comic) => comic.id === comicId ? { ...comic, isFavorite } : comic));
      throw error;
    }
  }, [allComics]);

  const toggleSeriesFavorite = useCallback(async (seriesId: string) => {
    const wasFavorite = favoriteSeriesIds.has(seriesId);
    setFavoriteSeriesIds((current) => { const next = new Set(current); if (wasFavorite) next.delete(seriesId); else next.add(seriesId); return next; });
    try {
      const savedRemotely = await toggleSupabaseSeriesFavorite(seriesId, wasFavorite);
      if (!savedRemotely) {
        const next = new Set(getLocalStorageItem<string[]>(SERIES_FAVORITES_KEY, []));
        if (wasFavorite) next.delete(seriesId); else next.add(seriesId);
        setLocalStorageItem(SERIES_FAVORITES_KEY, [...next]);
      }
      return !wasFavorite;
    } catch (error) {
      setFavoriteSeriesIds((current) => { const next = new Set(current); if (wasFavorite) next.add(seriesId); else next.delete(seriesId); return next; });
      throw error;
    }
  }, [favoriteSeriesIds]);

  const updateProgress = useCallback(
    async (comicId: string, currentPage: number, totalPages: number) => {
      const savedRemotely = await saveSupabaseProgress(comicId, currentPage, totalPages);
      if (!savedRemotely) await localProgressRepository.saveProgress(comicId, currentPage, totalPages);
      const now = new Date().toISOString();
      setAllComics((current) => current.map((comic) => comic.id === comicId ? { ...comic, progress: { comicId, currentPage, totalPages, percentage: Math.round(currentPage / Math.max(totalPages, 1) * 100), status: currentPage >= totalPages ? "completed" : "reading", lastReadAt: now, updatedAt: now } } : comic));
    },
    []
  );

  const setStatus = useCallback(
    async (comicId: string, status: ComicStatus, totalPages: number) => {
      const currentPage = allComics.find((comic) => comic.id === comicId)?.progress?.currentPage;
      const savedRemotely = await setSupabaseProgressStatus(comicId, status, totalPages, currentPage);
      if (!savedRemotely) await localProgressRepository.updateStatus(comicId, status, totalPages);
      const now = new Date().toISOString();
      setAllComics((current) => current.map((comic) => comic.id === comicId ? { ...comic, progress: { comicId, currentPage: status === "completed" ? totalPages : status === "not_started" ? 0 : currentPage || 1, totalPages, percentage: status === "completed" ? 100 : status === "not_started" ? 0 : Math.round((currentPage || 1) / Math.max(totalPages, 1) * 100), status, lastReadAt: now, updatedAt: now } } : comic));
    },
    [allComics]
  );

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  // HQs ativas para "Continuar Lendo"
  const continueReadingComics = useMemo(() => {
    return allComics
      .filter((c) => c.progress && c.progress.status === "reading")
      .sort((a, b) => {
        const dateA = a.progress?.lastReadAt ? new Date(a.progress.lastReadAt).getTime() : 0;
        const dateB = b.progress?.lastReadAt ? new Date(b.progress.lastReadAt).getTime() : 0;
        return dateB - dateA;
      });
  }, [allComics]);

  // HQs para "Adicionadas Recentemente"
  const recentlyAddedComics = useMemo(() => {
    return [...allComics]
      .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
      .slice(0, 6);
  }, [allComics]);

  // HQs filtradas para a seção "Toda a Biblioteca"
  const filteredComics = useMemo(() => {
    let result = [...allComics];

    if (filters.searchQuery.trim()) result = result.filter((comic) => matchesComicSearch(comic, filters.searchQuery));

    if (filters.series !== "all") {
      result = result.filter((c) => c.seriesId === filters.series);
    }

    if (filters.character !== "all") {
      result = result.filter((c) =>
        c.characters.some((char) => char.toLowerCase() === filters.character.toLowerCase())
      );
    }

    if (filters.publisher !== "all") {
      result = result.filter((c) => c.publisher.toLowerCase() === filters.publisher.toLowerCase());
    }

    if (filters.year !== "all") {
      const targetYear = parseInt(filters.year, 10);
      result = result.filter((c) => c.year === targetYear);
    }

    if (filters.status !== "all") {
      result = result.filter((c) => c.progress?.status === filters.status);
    }

    if (filters.favoritesOnly) {
      result = result.filter((c) => c.isFavorite);
    }

    result.sort((a, b) => {
      switch (filters.sortBy) {
        case "title_asc":
          return a.title.localeCompare(b.title, "pt-BR");
        case "title_desc":
          return b.title.localeCompare(a.title, "pt-BR");
        case "issue_asc":
          return a.issueNumber - b.issueNumber;
        case "issue_desc":
          return b.issueNumber - a.issueNumber;
        case "year_asc":
          return a.year - b.year;
        case "year_desc":
          return b.year - a.year;
        case "last_read_desc": {
          const dateA = a.progress?.lastReadAt ? new Date(a.progress.lastReadAt).getTime() : 0;
          const dateB = b.progress?.lastReadAt ? new Date(b.progress.lastReadAt).getTime() : 0;
          return dateB - dateA;
        }
        case "added_at_desc":
        default:
          return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
      }
    });

    return result;
  }, [allComics, filters]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.series !== "all") count++;
    if (filters.character !== "all") count++;
    if (filters.publisher !== "all") count++;
    if (filters.year !== "all") count++;
    if (filters.status !== "all") count++;
    if (filters.favoritesOnly) count++;
    return count;
  }, [filters]);

  return {
    allComics,
    filteredComics,
    continueReadingComics,
    recentlyAddedComics,
    seriesList,
    favoriteSeriesIds,
    charactersList,
    publishers,
    years,
    isLoading,
    filters,
    setFilters,
    resetFilters,
    activeFiltersCount,
    gridDensity,
    setGridDensity,
    toggleFavorite,
    toggleSeriesFavorite,
    updateProgress,
    setStatus,
    reloadData,
  };
}
