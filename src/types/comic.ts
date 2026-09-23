/**
 * Tipos e enums relacionados ao acervo de quadrinhos (HQs).
 */

export type ComicStatus = "not_started" | "reading" | "completed";
export type ContentType = "comic" | "graphic_novel" | "manga" | "manhwa" | "book";
export type ReadingDirection = "ltr" | "rtl";

export type SortOption =
  | "title_asc"
  | "title_desc"
  | "issue_asc"
  | "issue_desc"
  | "year_desc"
  | "year_asc"
  | "added_at_desc"
  | "last_read_desc";

export interface Character {
  id: string;
  name: string;
  alias?: string;
  publisher: string;
  comicsCount?: number;
  description?: string;
}

export interface Series {
  id: string;
  parentSeriesId?: string;
  title: string;
  publisher: string;
  startYear: number;
  endYear?: number;
  totalIssuesExpected?: number;
  description: string;
  bannerTone?: string;
  coverKey?: string;
  coverUrl?: string;
}

export interface ComicCoverPalette {
  primary: string;
  secondary: string;
  accent: string;
  badgeBg: string;
  badgeText: string;
  pattern: "geometric" | "noir" | "cosmic" | "cyber" | "vintage" | "minimal";
}

export interface Comic {
  id: string;
  title: string;
  contentType?: ContentType;
  readingDirection?: ReadingDirection;
  issueNumber: number;
  seriesId: string;
  seriesTitle: string;
  volume?: number;
  year: number;
  publisher: string;
  characters: string[]; // nomes ou IDs dos personagens
  totalPages: number;
  synopsis: string;
  writers: string[];
  pencillers: string[];
  colorists?: string[];
  fileSizeMb: number;
  fileName: string;
  pdfPath?: string; // Caminho no bucket Cloudflare R2 futuramente
  coverPath?: string;
  coverUrl?: string;
  addedAt: string; // ISO 8601
  tags: string[];
  coverStyle: ComicCoverPalette;
  // Campos derivados/dinâmicos de leitura
  isFavorite?: boolean;
  progress?: ReadingProgress;
}

export interface ReadingProgress {
  comicId: string;
  currentPage: number;
  totalPages: number;
  percentage: number;
  status: ComicStatus;
  lastReadAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface LibraryFilters {
  searchQuery: string;
  series: string;
  character: string;
  publisher: string;
  year: string;
  status: "all" | ComicStatus;
  favoritesOnly: boolean;
  sortBy: SortOption;
}
