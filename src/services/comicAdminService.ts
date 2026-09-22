import type { Comic, Series } from "../types/comic";
import { supabase } from "./supabaseClient";

export type ComicRegistration = {
  title: string;
  issueNumber: number;
  year: number;
  totalPages: number;
  fileName: string;
  fileSizeMb: number;
  pdfKey: string;
  coverKey?: string;
  synopsis: string;
  writers: string[];
  pencillers: string[];
  colorists: string[];
  tags: string[];
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
  if (!response.ok) throw new Error(payload?.error || "Não foi possível concluir a operação.");
  return payload;
}

export async function createComicRecord(input: ComicRegistration): Promise<string> {
  const payload = await ownerRequest("/api/comics/create", input);
  return payload.id;
}

export async function updateComicRecord(comicId: string, input: Partial<ComicRegistration>): Promise<void> {
  await ownerRequest("/api/comics/update", { id: comicId, ...input }, "PATCH");
}

export async function saveSeriesRecord(series: Omit<Series, "id"> & { id?: string }): Promise<string> {
  const payload = await ownerRequest("/api/series/upsert", series);
  return payload.id;
}

export function comicToRegistration(comic: Comic, series: Series): ComicRegistration {
  return {
    title: comic.title,
    issueNumber: comic.issueNumber,
    year: comic.year,
    totalPages: comic.totalPages,
    fileName: comic.fileName,
    fileSizeMb: comic.fileSizeMb,
    pdfKey: comic.pdfPath || "",
    coverKey: comic.coverPath,
    synopsis: comic.synopsis,
    writers: comic.writers,
    pencillers: comic.pencillers,
    colorists: comic.colorists || [],
    tags: comic.tags,
    series,
  };
}
