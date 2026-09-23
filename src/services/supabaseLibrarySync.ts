import { Comic, ComicStatus, ReadingProgress } from "../types/comic";
import { supabase } from "./supabaseClient";

type RemoteProgress = {
  comic_id: string;
  current_page: number;
  total_pages: number;
  percentage: number | string;
  status: ComicStatus;
  last_read_at: string | null;
  updated_at: string;
};

export type SupabaseLibraryState = {
  favoriteIds: Set<string>;
  favoriteSeriesIds: Set<string>;
  progressByComicId: Map<string, ReadingProgress>;
};

async function getAuthenticatedUserId(): Promise<string | null> {
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

export async function getSupabaseLibraryState(): Promise<SupabaseLibraryState | null> {
  try {
    const userId = await getAuthenticatedUserId();
    if (!supabase || !userId) return null;

    const [favoritesResult, seriesFavoritesResult, progressResult] = await Promise.all([
      supabase.from("favorites").select("comic_id").eq("user_id", userId),
      supabase.from("series_favorites").select("series_id").eq("user_id", userId),
      supabase
        .from("reading_progress")
        .select("comic_id, current_page, total_pages, percentage, status, last_read_at, updated_at")
        .eq("user_id", userId),
    ]);

    if (favoritesResult.error || seriesFavoritesResult.error || progressResult.error) return null;

    const favoriteIds = new Set((favoritesResult.data ?? []).map((item) => item.comic_id));
    const favoriteSeriesIds = new Set((seriesFavoritesResult.data ?? []).map((item) => item.series_id));
    const progressByComicId = new Map<string, ReadingProgress>();

    for (const item of (progressResult.data ?? []) as RemoteProgress[]) {
      progressByComicId.set(item.comic_id, {
        comicId: item.comic_id,
        currentPage: item.current_page,
        totalPages: item.total_pages,
        percentage: Number(item.percentage),
        status: item.status,
        lastReadAt: item.last_read_at ?? "",
        updatedAt: item.updated_at,
      });
    }

    return { favoriteIds, favoriteSeriesIds, progressByComicId };
  } catch {
    return null;
  }
}

export function applySupabaseLibraryState(comics: Comic[], state: SupabaseLibraryState): Comic[] {
  return comics.map((comic) => ({
    ...comic,
    isFavorite: state.favoriteIds.has(comic.id),
    progress: state.progressByComicId.get(comic.id) ?? comic.progress,
  }));
}

export async function toggleSupabaseFavorite(comicId: string, isFavorite: boolean): Promise<boolean> {
  try {
    const userId = await getAuthenticatedUserId();
    if (!supabase || !userId) return false;

    const result = isFavorite
      ? await supabase.from("favorites").delete().eq("user_id", userId).eq("comic_id", comicId)
      : await supabase.from("favorites").insert({ user_id: userId, comic_id: comicId });

    return !result.error;
  } catch {
    return false;
  }
}

export async function toggleSupabaseSeriesFavorite(seriesId: string, isFavorite: boolean): Promise<boolean> {
  const userId = await getAuthenticatedUserId();
  if (!supabase || !userId) return false;
  const result = isFavorite
    ? await supabase.from("series_favorites").delete().eq("user_id", userId).eq("series_id", seriesId)
    : await supabase.from("series_favorites").insert({ user_id: userId, series_id: seriesId });
  if (result.error) throw new Error("Não foi possível salvar o favorito. Tente novamente.");
  return true;
}

export async function saveSupabaseProgress(
  comicId: string,
  currentPage: number,
  totalPages: number
): Promise<boolean> {
  try {
    const userId = await getAuthenticatedUserId();
    if (!supabase || !userId) return false;

    const page = Math.max(0, Math.min(currentPage, totalPages));
    const status: ComicStatus = page === 0 ? "not_started" : page === totalPages ? "completed" : "reading";
    const { error } = await supabase.from("reading_progress").upsert(
      {
        user_id: userId,
        comic_id: comicId,
        current_page: page,
        total_pages: totalPages,
        status,
        last_read_at: page > 0 ? new Date().toISOString() : null,
      },
      { onConflict: "user_id,comic_id" }
    );

    return !error;
  } catch {
    return false;
  }
}

export async function setSupabaseProgressStatus(
  comicId: string,
  status: ComicStatus,
  totalPages: number,
  currentPage?: number
): Promise<boolean> {
  const page =
    status === "completed" ? totalPages : status === "not_started" ? 0 : Math.max(1, Math.min(currentPage ?? 1, totalPages - 1));
  return saveSupabaseProgress(comicId, page, totalPages);
}
