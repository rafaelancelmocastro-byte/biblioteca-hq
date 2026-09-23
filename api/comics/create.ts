import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireOwner } from "../_lib/auth.js";

type CreateComicBody = {
  title?: string;
  contentType?: string;
  readingDirection?: string;
  issueNumber?: number;
  year?: number;
  totalPages?: number;
  fileName?: string;
  fileSizeMb?: number;
  pdfKey?: string;
  coverKey?: string;
  coverThumbKey?: string;
  fileSha256?: string;
  volume?: number;
  allowDuplicate?: boolean;
  synopsis?: string;
  writers?: string[];
  pencillers?: string[];
  colorists?: string[];
  tags?: string[];
  characters?: string[];
  series?: {
    id?: string;
    title?: string;
    publisher?: string;
    startYear?: number;
    description?: string;
    totalIssuesExpected?: number;
    bannerTone?: string;
  };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  if (!(await requireOwner(req, res))) return;

  const body = (req.body ?? {}) as CreateComicBody;
  if (body.contentType && !["comic", "graphic_novel", "manga", "manhwa", "book"].includes(body.contentType) || body.readingDirection && !["ltr", "rtl"].includes(body.readingDirection)) return res.status(400).json({ error: "Formato ou direção de leitura inválidos." });
  if (
    !body.title?.trim() ||
    !body.fileName?.trim() ||
    !/^comics\/[a-f0-9-]+\.(pdf|cbr|epub|azw3)$/i.test(body.pdfKey || "") ||
    !body.series?.id && !body.series?.title?.trim() ||
    !body.series?.publisher?.trim() ||
    !Number.isInteger(body.issueNumber) ||
    !Number.isInteger(body.year) ||
    !Number.isInteger(body.totalPages) ||
    (body.issueNumber ?? 0) < 1 ||
    (body.totalPages ?? 0) < 1
  ) {
    return res.status(400).json({ error: "Metadados da HQ inválidos." });
  }

  const url = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return res.status(503).json({ error: "Banco de dados indisponível." });

  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const startYear = body.series.startYear ?? body.year!;
  let series: { id: string } | null = null;
  if (body.series.id) {
    const found = await admin.from("series").select("id").eq("id", body.series.id).is("deleted_at", null).maybeSingle();
    series = found.data;
    if (!series) return res.status(400).json({ error: "Coleção ou saga não encontrada." });
  } else {
    const found = await admin.from("series").select("id").eq("title", body.series.title!.trim()).eq("publisher", body.series.publisher.trim()).eq("start_year", startYear).maybeSingle();
    series = found.data;
  }

  if (!series) {
    const created = await admin
      .from("series")
      .insert({
        title: body.series.title!.trim(),
        publisher: body.series.publisher.trim(),
        start_year: startYear,
        total_issues_expected: body.series.totalIssuesExpected ?? null,
        description: body.series.description ?? "",
        banner_tone: body.series.bannerTone ?? null,
      })
      .select("id")
      .single();
    if (created.error) return res.status(400).json({ error: `Não foi possível cadastrar a coleção: ${created.error.message}` });
    series = created.data;
  }

  if (!series) return res.status(500).json({ error: "Coleção indisponível." });
  if (body.fileSha256 && /^[a-f0-9]{64}$/i.test(body.fileSha256)) {
    const hashMatch = await admin.from("comics").select("id,title").eq("file_sha256", body.fileSha256).is("deleted_at", null).limit(1).maybeSingle();
    if (hashMatch.data && !body.allowDuplicate) return res.status(409).json({ code: "SAME_FILE", existing: hashMatch.data, error: "Este mesmo arquivo já está cadastrado." });
  }
  const identityMatch = await admin.from("comics").select("id,title,publication_year,publisher,volume").eq("series_id", series.id).eq("issue_number", body.issueNumber!).eq("publication_year", body.year!).is("deleted_at", null);
  const sameIdentity = (identityMatch.data ?? []).find((item) =>
    (item.volume ?? null) === (body.volume ?? null) && item.publisher.toLocaleLowerCase("pt-BR") === body.series!.publisher!.toLocaleLowerCase("pt-BR") && item.title.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR").trim() === body.title!.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR").trim()
  );
  if (sameIdentity && !body.allowDuplicate) return res.status(409).json({ code: "POSSIBLE_DUPLICATE", existing: sameIdentity, error: "Já existe uma edição com esta combinação de título, coleção, volume, número, ano e editora." });

  const createdComic = await admin
    .from("comics")
    .insert({
      series_id: series.id,
      title: body.title.trim(),
      content_type: body.contentType ?? "comic",
      reading_direction: body.readingDirection ?? (body.contentType === "manga" ? "rtl" : "ltr"),
      issue_number: body.issueNumber,
      volume: body.volume ?? null,
      publication_year: body.year,
      publisher: body.series.publisher.trim(),
      total_pages: body.totalPages,
      file_size_mb: body.fileSizeMb ?? 0,
      file_name: body.fileName.trim(),
      pdf_key: body.pdfKey,
      cover_key: body.coverKey ?? null,
      cover_thumb_key: body.coverThumbKey ?? null,
      file_sha256: body.fileSha256 ?? null,
      synopsis: body.synopsis?.trim() ?? "",
      writers: body.writers ?? [],
      pencillers: body.pencillers ?? [],
      colorists: body.colorists ?? [],
      tags: body.tags ?? [],
    })
    .select("id")
    .single();

  if (createdComic.error) {
    const duplicate = createdComic.error.code === "23505";
    return res.status(duplicate ? 409 : 400).json({ code: duplicate ? "DUPLICATE_KEY" : "INVALID_METADATA", error: duplicate ? "Este mesmo arquivo já está cadastrado." : `Não foi possível cadastrar a HQ: ${createdComic.error.message}` });
  }

  const names = [...new Set((body.characters ?? []).map((item) => item.trim()).filter(Boolean))].sort();
  if (names.length) {
    const { data: characters, error: characterError } = await admin.from("characters")
      .upsert(names.map((name) => ({ name, publisher: body.series!.publisher!.trim() })), { onConflict: "name,publisher" })
      .select("id");
    if (characterError) console.warn("Não foi possível associar personagens à edição", { comicId: createdComic.data.id, error: characterError.message });
    else if (characters?.length) {
      const { error: linkError } = await admin.from("comic_characters").upsert(
        characters.map((character) => ({ comic_id: createdComic.data.id, character_id: character.id })),
        { onConflict: "comic_id,character_id", ignoreDuplicates: true },
      );
      if (linkError) console.warn("Não foi possível vincular personagens à edição", { comicId: createdComic.data.id, error: linkError.message });
    }
  }

  return res.status(201).json({ id: createdComic.data.id });
}
