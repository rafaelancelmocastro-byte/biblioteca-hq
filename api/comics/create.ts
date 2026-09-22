import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireOwner } from "../_lib/auth.js";

type CreateComicBody = {
  title?: string;
  issueNumber?: number;
  year?: number;
  totalPages?: number;
  fileName?: string;
  fileSizeMb?: number;
  pdfKey?: string;
  coverKey?: string;
  synopsis?: string;
  writers?: string[];
  pencillers?: string[];
  colorists?: string[];
  tags?: string[];
  series?: {
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
  if (
    !body.title?.trim() ||
    !body.fileName?.trim() ||
    !body.pdfKey?.startsWith("comics/") ||
    !body.series?.title?.trim() ||
    !body.series.publisher?.trim() ||
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
  let { data: series } = await admin
    .from("series")
    .select("id")
    .eq("title", body.series.title.trim())
    .eq("publisher", body.series.publisher.trim())
    .eq("start_year", startYear)
    .maybeSingle();

  if (!series) {
    const created = await admin
      .from("series")
      .insert({
        title: body.series.title.trim(),
        publisher: body.series.publisher.trim(),
        start_year: startYear,
        total_issues_expected: body.series.totalIssuesExpected ?? null,
        description: body.series.description ?? "",
        banner_tone: body.series.bannerTone ?? null,
      })
      .select("id")
      .single();
    if (created.error) return res.status(409).json({ error: "Não foi possível cadastrar a série." });
    series = created.data;
  }

  const createdComic = await admin
    .from("comics")
    .insert({
      series_id: series.id,
      title: body.title.trim(),
      issue_number: body.issueNumber,
      publication_year: body.year,
      publisher: body.series.publisher.trim(),
      total_pages: body.totalPages,
      file_size_mb: body.fileSizeMb ?? 0,
      file_name: body.fileName.trim(),
      pdf_key: body.pdfKey,
      cover_key: body.coverKey ?? null,
      synopsis: body.synopsis?.trim() ?? "",
      writers: body.writers ?? [],
      pencillers: body.pencillers ?? [],
      colorists: body.colorists ?? [],
      tags: body.tags ?? [],
    })
    .select("id")
    .single();

  if (createdComic.error) {
    return res.status(409).json({ error: "A edição já existe ou os metadados são inválidos." });
  }

  return res.status(201).json({ id: createdComic.data.id });
}
