import type { Comic, Series } from "../types/comic";
import { supabase } from "./supabaseClient";

export type ComicRegistration = {
  title: string;
  contentType?: Comic["contentType"];
  readingDirection?: Comic["readingDirection"];
  issueNumber: number;
  year: number;
  totalPages: number;
  fileName: string;
  fileSizeMb: number;
  pdfKey: string;
  coverKey?: string;
  coverThumbKey?: string;
  fileSha256?: string;
  volume?: number;
  allowDuplicate?: boolean;
  synopsis: string;
  writers: string[];
  pencillers: string[];
  colorists: string[];
  tags: string[];
  characters?: string[];
  series: Series;
};

async function ownerRequest(path: string, body: unknown, method = "POST") {
  if (!supabase) throw new Error("Supabase não está configurado.");
  const { data } = await supabase.auth.getSession();
  if (!data.session?.access_token) throw new Error("Sua sessão expirou. Entre novamente.");
  const response = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(payload?.error || "Não foi possível concluir a operação.") as Error & { code?: string; existing?: { id: string; title: string } };
    error.code = payload?.code;
    error.existing = payload?.existing;
    throw error;
  }
  return payload;
}

export async function createComicRecord(input: ComicRegistration): Promise<string> {
  const payload = await ownerRequest("/api/comics/create", input);
  return payload.id;
}

export async function checkComicDuplicate(input: Pick<ComicRegistration, "title" | "issueNumber" | "year" | "volume" | "fileSha256" | "series">): Promise<{ code: string; existing?: { id: string; title: string }; message?: string }> {
  return ownerRequest("/api/comics/check", { title: input.title, issueNumber: input.issueNumber, year: input.year, volume: input.volume, fileSha256: input.fileSha256, seriesId: input.series.id, publisher: input.series.publisher });
}

export async function checkStorageStatuses(ids: string[]): Promise<Record<string, "present" | "pending" | "error">> {
  const statuses: Record<string, "present" | "pending" | "error"> = {};
  for (let offset = 0; offset < ids.length; offset += 40) {
    const result = await ownerRequest("/api/comics/check", { action: "storage-status", ids: ids.slice(offset, offset + 40) });
    Object.assign(statuses, result.statuses || {});
  }
  return statuses;
}

export async function updateComicRecord(comicId: string, input: Partial<ComicRegistration>): Promise<void> {
  await ownerRequest("/api/comics/update", { id: comicId, ...input }, "PATCH");
}

export type SelectedComicPatch = Partial<Pick<ComicRegistration, "title" | "year" | "synopsis" | "writers" | "pencillers" | "colorists" | "tags" | "contentType" | "readingDirection">> & { seriesId?: string };

export async function updateSelectedComics(ids: string[], fields: SelectedComicPatch): Promise<number> {
  const payload = await ownerRequest("/api/comics/bulk-update", { ids, fields }, "PATCH");
  return Number(payload.updated || 0);
}

export async function updateCollectionComics(
  seriesId: string,
  input: Pick<ComicRegistration, "synopsis" | "writers" | "pencillers" | "colorists" | "tags">,
): Promise<number> {
  const payload = await ownerRequest("/api/comics/bulk-update", { seriesId, ...input }, "PATCH");
  return Number(payload.updated || 0);
}

export async function saveSeriesRecord(series: Omit<Series, "id"> & { id?: string }): Promise<string> {
  const payload = await ownerRequest("/api/series/upsert", series);
  return payload.id;
}

export async function deleteComicRecords(ids: string[]): Promise<number> {
  const payload = await ownerRequest("/api/comics/delete", { ids });
  return Number(payload.deleted || 0);
}

export async function deleteSeriesRecord(id: string, deleteContents: boolean): Promise<void> {
  await ownerRequest("/api/series/delete", { id, deleteContents });
}

export function comicToRegistration(comic: Comic, series: Series): ComicRegistration {
  return {
    title: comic.title,
    contentType: comic.contentType,
    readingDirection: comic.readingDirection,
    issueNumber: comic.issueNumber,
    year: comic.year,
    totalPages: comic.totalPages,
    fileName: comic.fileName,
    fileSizeMb: comic.fileSizeMb,
    pdfKey: comic.pdfPath || "",
    coverKey: comic.coverPath,
    volume: comic.volume,
    synopsis: comic.synopsis,
    writers: comic.writers,
    pencillers: comic.pencillers,
    colorists: comic.colorists || [],
    tags: comic.tags,
    characters: comic.characters,
    series,
  };
}
