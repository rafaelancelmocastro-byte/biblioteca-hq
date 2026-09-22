import type { Character, Comic, ComicCoverPalette, Series } from "../types/comic";
import { supabase } from "./supabaseClient";
import { storageProvider } from "./storageProvider";

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
  pdf_key: string | null;
  cover_key: string | null;
  cover_palette: ComicCoverPalette | null;
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
  };
  comic_characters?: Array<{ characters: { id: string; name: string; alias: string | null; publisher: string } }>;
};

export type SupabaseCatalog = {
  comics: Comic[];
  series: Series[];
  characters: Character[];
  publishers: string[];
  years: number[];
};

function mapSeries(row: CatalogRow["series"]): Series {
  return {
    id: row.id,
    title: row.title,
    publisher: row.publisher,
    startYear: row.start_year,
    endYear: row.end_year ?? undefined,
    totalIssuesExpected: row.total_issues_expected ?? undefined,
    description: row.description,
    bannerTone: row.banner_tone ?? undefined,
  };
}

async function mapComic(row: CatalogRow): Promise<Comic> {
  let coverUrl: string | undefined;
  if (row.cover_key) {
    try {
      coverUrl = await storageProvider.getFileUrl(row.cover_key);
    } catch {
      coverUrl = undefined;
    }
  }

  return {
    id: row.id,
    title: row.title,
    issueNumber: row.issue_number,
    seriesId: row.series.id,
    seriesTitle: row.series.title,
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
    pdfPath: row.pdf_key ?? undefined,
    coverPath: row.cover_key ?? undefined,
    coverUrl,
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

export async function getSupabaseCatalog(): Promise<SupabaseCatalog> {
  if (!supabase) return { comics: [], series: [], characters: [], publishers: [], years: [] };

  const [comicsResult, seriesResult] = await Promise.all([
    supabase.from("comics").select("*, series(*), comic_characters(characters(id,name,alias,publisher))").order("added_at", { ascending: false }),
    supabase.from("series").select("*").order("title", { ascending: true }),
  ]);

  if (comicsResult.error) throw new Error(`Não foi possível carregar o catálogo: ${comicsResult.error.message}`);
  const rows = (comicsResult.data ?? []) as unknown as CatalogRow[];
  const comics = await Promise.all(rows.map(mapComic));
  const seriesById = new Map<string, Series>();
  const charactersById = new Map<string, Character>();

  for (const row of rows) {
    seriesById.set(row.series.id, mapSeries(row.series));
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

  if (!seriesResult.error) {
    for (const row of seriesResult.data ?? []) {
      seriesById.set(row.id, mapSeries(row as CatalogRow["series"]));
    }
  }

  return {
    comics,
    series: [...seriesById.values()].sort((a, b) => a.title.localeCompare(b.title, "pt-BR")),
    characters: [...charactersById.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    publishers: [...new Set(comics.map((comic) => comic.publisher))].sort(),
    years: [...new Set(comics.map((comic) => comic.year))].sort((a, b) => b - a),
  };
}

export async function getSupabaseComicById(id: string): Promise<Comic | null> {
  const catalog = await getSupabaseCatalog();
  return catalog.comics.find((comic) => comic.id === id) ?? null;
}
