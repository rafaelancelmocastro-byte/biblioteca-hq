import type { Character, Comic, ComicCoverPalette, Series } from "../types/comic";
import { ensureActiveSession, supabase } from "./supabaseClient";

const DEFAULT_COVER: ComicCoverPalette = {
  primary: "#0f172a",
  secondary: "#334155",
  accent: "#f59e0b",
  badgeBg: "#111827",
  badgeText: "#ffffff",
  pattern: "minimal",
};

type CatalogRow = {
  id: string;
  title: string;
  content_type: Comic["contentType"];
  reading_direction: Comic["readingDirection"];
  issue_number: number;
  volume: number | null;
  publication_year: number;
  publisher: string;
  total_pages: number;
  synopsis: string;
  writers: string[];
  pencillers: string[];
  colorists: string[];
  tags: string[];
  file_size_mb: number | string | null;
  file_name: string;
  cover_palette: ComicCoverPalette | null;
  cover_key?: string | null;
  cover_thumb_key?: string | null;
  added_at: string;
  series: {
    id: string;
    title: string;
    publisher: string;
    start_year: number;
    end_year: number | null;
    total_issues_expected: number | null;
    description: string;
    banner_tone: string | null;
    cover_key: string | null;
    parent_series_id?: string | null;
  } | null;
  comic_characters?: Array<{ characters: { id: string; name: string; alias: string | null; publisher: string } }>;
};

export type SupabaseCatalog = {
  comics: Comic[];
  series: Series[];
  characters: Character[];
  publishers: string[];
  years: number[];
};

function mapSeries(row: NonNullable<CatalogRow["series"]>): Series {
  return {
    id: row.id,
    title: row.title,
    publisher: row.publisher,
    startYear: row.start_year,
    endYear: row.end_year ?? undefined,
    totalIssuesExpected: row.total_issues_expected ?? undefined,
    description: row.description,
    bannerTone: row.banner_tone ?? undefined,
    coverKey: row.cover_key ?? undefined,
    parentSeriesId: row.parent_series_id ?? undefined,
  };
}

function mapComic(row: CatalogRow): Comic {
  return {
    id: row.id,
    title: row.title,
    contentType: row.content_type ?? "comic",
    readingDirection: row.reading_direction ?? "ltr",
    issueNumber: row.issue_number,
    seriesId: row.series?.id ?? "",
    seriesTitle: row.series?.title ?? "",
    volume: row.volume ?? undefined,
    year: row.publication_year,
    publisher: row.publisher,
    characters: (row.comic_characters ?? []).map((item) => item.characters.name),
    totalPages: row.total_pages,
    synopsis: row.synopsis,
    writers: row.writers ?? [],
    pencillers: row.pencillers ?? [],
    colorists: row.colorists ?? [],
    fileSizeMb: Number(row.file_size_mb ?? 0),
    fileName: row.file_name,
    coverUrl: coverCache.get(row.id)?.url,
    hasCover: Boolean(row.cover_thumb_key || row.cover_key),
    addedAt: row.added_at,
    tags: row.tags ?? [],
    coverStyle: row.cover_palette ?? DEFAULT_COVER,
    isFavorite: false,
    progress: {
      comicId: row.id,
      currentPage: 0,
      totalPages: row.total_pages,
      percentage: 0,
      status: "not_started",
      lastReadAt: "",
      updatedAt: "",
    },
  };
}

const coverCache = new Map<string, { url: string; expiresAt: number }>();
let catalogCache: { value: SupabaseCatalog; expiresAt: number } | null = null;
let pendingCatalog: Promise<SupabaseCatalog> | null = null;
type CoverQueueEntry = { comic: Comic; resolvers: Array<() => void> };
const coverQueue = new Map<string, CoverQueueEntry>();
let coverFlushTimer: number | null = null;
let coverFlushRunning = false;

const CATALOG_CACHE_NAME = "biblioteca-hq-data-v1";
const CATALOG_CACHE_URL = "/__offline/catalog.json";

async function readPersistentCatalog(): Promise<SupabaseCatalog | null> {
  try {
    if (!("caches" in window)) return null;
    const response = await (await caches.open(CATALOG_CACHE_NAME)).match(CATALOG_CACHE_URL);
    return response ? await response.json() as SupabaseCatalog : null;
  } catch {
    return null;
  }
}

async function writePersistentCatalog(value: SupabaseCatalog): Promise<void> {
  try {
    if (!("caches" in window) || !value.comics.length) return;
    const cache = await caches.open(CATALOG_CACHE_NAME);
    await cache.put(
      CATALOG_CACHE_URL,
      new Response(JSON.stringify(value), { headers: { "Content-Type": "application/json" } })
    );
  } catch {
    // Persistent catalog is a convenience fallback only.
  }
}


export function invalidateCoverCache() {
  coverCache.clear();
}

export async function refreshCoverUrl(comic: Comic): Promise<string | undefined> {
  coverCache.delete(comic.id);
  const urls = await getCoverUrls([comic]);
  return urls[comic.id];
}

// Invalida cache de URLs de capas assinadas quando a autenticação mudar
if (supabase) {
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT" || event === "USER_UPDATED") {
      invalidateCoverCache();
      invalidateCatalogCache();
    }
  });
}

export function invalidateCatalogCache() {
  catalogCache = null;
  pendingCatalog = null;
}

export async function getCoverUrls(comics: Comic[]): Promise<Record<string, string>> {
  if (!supabase || !comics.length) return {};
  const now = Date.now();
  const unique = [...new Map(comics.map((comic) => [comic.id, comic])).values()];
  const missing = unique.filter((comic) => !coverCache.has(comic.id) || coverCache.get(comic.id)!.expiresAt < now);

  const queue = (comic: Comic) =>
    new Promise<void>((resolve) => {
      const existing = coverQueue.get(comic.id);
      if (existing) existing.resolvers.push(resolve);
      else coverQueue.set(comic.id, { comic, resolvers: [resolve] });

      if (coverFlushTimer === null && !coverFlushRunning) {
        coverFlushTimer = window.setTimeout(() => {
          coverFlushTimer = null;
          void flushCoverQueue();
        }, 16);
      }
    });

  await Promise.all(missing.map(queue));

  return Object.fromEntries(
    unique
      .map((comic) => [comic.id, coverCache.get(comic.id)?.url] as const)
      .filter((entry): entry is readonly [string, string] => typeof entry[1] === "string")
  );
}

async function flushCoverQueue(): Promise<void> {
  if (coverFlushRunning || !coverQueue.size) return;
  coverFlushRunning = true;
  const entries = [...coverQueue.values()];
  coverQueue.clear();

  try {
    let session = await ensureActiveSession();
    if (!session) return;

    const fetchComicBatch = (comicBatch: Comic[], token: string) =>
      fetch("/api/storage/cover-urls", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ comicIds: comicBatch.map((comic) => comic.id) }),
      });

    const comics = entries.map((entry) => entry.comic);
    for (let offset = 0; offset < comics.length; offset += 100) {
      const batch = comics.slice(offset, offset + 100);
      try {
        let response = await fetchComicBatch(batch, session.access_token);
        if (response.status === 401 || response.status === 403) {
          const refreshed = await ensureActiveSession(true);
          if (refreshed?.access_token) {
            session = refreshed;
            response = await fetchComicBatch(batch, refreshed.access_token);
          }
        }
        if (!response.ok) continue;

        const payload = await response.json();
        for (const [id, url] of Object.entries(payload.urls || {})) {
          if (typeof url === "string") {
            coverCache.set(id, { url, expiresAt: Date.now() + 13 * 60_000 });
          }
        }
      } catch {
        // A capa continua opcional; novas tentativas acontecem quando o item voltar a ser exibido.
      }
    }
  } finally {
    for (const entry of entries) for (const resolve of entry.resolvers) resolve();
    coverFlushRunning = false;
    if (coverQueue.size && coverFlushTimer === null) {
      coverFlushTimer = window.setTimeout(() => {
        coverFlushTimer = null;
        void flushCoverQueue();
      }, 16);
    }
  }
}

export async function getSupabaseCatalog(): Promise<SupabaseCatalog> {
  if (!supabase) return { comics: [], series: [], characters: [], publishers: [], years: [] };
  if (catalogCache && catalogCache.expiresAt > Date.now() && catalogCache.value.comics.length > 0) return catalogCache.value;
  if (!navigator.onLine) {
    const saved = await readPersistentCatalog();
    return saved ?? { comics: [], series: [], characters: [], publishers: [], years: [] };
  }
  if (pendingCatalog) return pendingCatalog;

  pendingCatalog = loadCatalog().catch(async (error) => {
    const saved = await readPersistentCatalog();
    if (saved) return saved;
    throw error;
  }).finally(() => { pendingCatalog = null; });
  return pendingCatalog;
}

async function loadCatalog(): Promise<SupabaseCatalog> {
  if (!supabase) return { comics: [], series: [], characters: [], publishers: [], years: [] };

  await ensureActiveSession();

  const PAGE_SIZE = 1000;
  const comicRows: CatalogRow[] = [];
  const seriesRows: NonNullable<CatalogRow["series"]>[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const result = await supabase
      .from("comics")
      .select("id,title,content_type,reading_direction,issue_number,volume,publication_year,publisher,total_pages,synopsis,writers,pencillers,colorists,tags,file_size_mb,file_name,cover_palette,cover_key,cover_thumb_key,added_at,series(id,title,publisher,start_year,end_year,total_issues_expected,description,banner_tone,cover_key),comic_characters(characters(id,name,alias,publisher))")
      .order("added_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (result.error) throw new Error(`Não foi possível carregar o catálogo: ${result.error.message}`);
    const page = (result.data ?? []) as unknown as CatalogRow[];
    comicRows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  for (let from = 0; ; from += PAGE_SIZE) {
    const result = await supabase
      .from("series")
      .select("id,title,publisher,start_year,end_year,total_issues_expected,description,banner_tone,cover_key,parent_series_id")
      .order("title", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (result.error) break;
    const page = (result.data ?? []) as unknown as NonNullable<CatalogRow["series"]>[];
    seriesRows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  const rows = comicRows;
  const comics = rows.map(mapComic);
  const seriesById = new Map<string, Series>();
  const charactersById = new Map<string, Character>();

  for (const row of rows) {
    if (row.series) seriesById.set(row.series.id, mapSeries(row.series));
    for (const relation of row.comic_characters ?? []) {
      const character = relation.characters;
      charactersById.set(character.id, {
        id: character.id,
        name: character.name,
        alias: character.alias ?? undefined,
        publisher: character.publisher,
      });
    }
  }

  for (const row of seriesRows) {
    seriesById.set(row.id, mapSeries(row));
  }

  const value = {
    comics,
    series: [...seriesById.values()].sort((a, b) => a.title.localeCompare(b.title, "pt-BR")),
    characters: [...charactersById.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    publishers: [...new Set(comics.map((comic) => comic.publisher))].sort(),
    years: [...new Set(comics.map((comic) => comic.year))].sort((a, b) => b - a),
  };

  if (comics.length > 0) {
    catalogCache = { value, expiresAt: Date.now() + 60_000 };
    void writePersistentCatalog(value);
  }
  return value;
}

export async function getSupabaseComicById(id: string): Promise<Comic | null> {
  if (!supabase) return null;
  const cached = catalogCache?.value.comics.find((comic) => comic.id === id);
  if (!cached) {
    await ensureActiveSession();
  }
  const comicRequest = cached ? Promise.resolve({ data: null, error: null }) : supabase.from("comics")
    .select("id,title,content_type,reading_direction,issue_number,volume,publication_year,publisher,total_pages,synopsis,writers,pencillers,colorists,tags,file_size_mb,file_name,cover_palette,cover_key,cover_thumb_key,added_at,series(id,title,publisher,start_year,end_year,total_issues_expected,description,banner_tone,cover_key),comic_characters(characters(id,name,alias,publisher))")
    .eq("id", id).maybeSingle();
  const [record, progress] = await Promise.all([comicRequest, supabase.from("reading_progress").select("current_page,total_pages,status,last_read_at,updated_at").eq("comic_id", id).maybeSingle()]);
  if (!cached && (record.error || !record.data)) return null;
  const comic = cached ? { ...cached } : mapComic(record.data as unknown as CatalogRow);
  if (progress.data) {
    const row = progress.data;
    comic.progress = { comicId: id, currentPage: row.current_page, totalPages: row.total_pages, percentage: row.total_pages > 0 ? Math.round(row.current_page / row.total_pages * 100) : 0, status: row.status, lastReadAt: row.last_read_at || "", updatedAt: row.updated_at || "" };
  }
  return comic;
}
