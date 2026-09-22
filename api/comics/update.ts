import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireOwner } from "../_lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "PATCH") { res.setHeader("Allow", "PATCH"); return res.status(405).json({ error: "Method Not Allowed" }); }
  if (!(await requireOwner(req, res))) return;
  const body = req.body ?? {};
  if (typeof body.id !== "string" || !body.title?.trim() || !body.series?.id) return res.status(400).json({ error: "Metadados inválidos." });
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(503).json({ error: "Banco de dados indisponível." });
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const update = {
    series_id: body.series.id,
    title: body.title.trim(),
    issue_number: Number(body.issueNumber),
    volume: body.volume ? Number(body.volume) : null,
    publication_year: Number(body.year),
    publisher: body.series.publisher,
    total_pages: Number(body.totalPages),
    synopsis: body.synopsis?.trim() ?? "",
    writers: Array.isArray(body.writers) ? body.writers : [],
    pencillers: Array.isArray(body.pencillers) ? body.pencillers : [],
    colorists: Array.isArray(body.colorists) ? body.colorists : [],
    tags: Array.isArray(body.tags) ? body.tags : [],
    ...(body.fileName ? { file_name: body.fileName } : {}),
    ...(body.fileSizeMb ? { file_size_mb: Number(body.fileSizeMb) } : {}),
    ...(body.pdfKey ? { pdf_key: body.pdfKey } : {}),
    ...(body.coverKey ? { cover_key: body.coverKey } : {}),
    ...(body.coverThumbKey !== undefined ? { cover_thumb_key: body.coverThumbKey || null } : {}),
    ...(body.fileSha256 !== undefined ? { file_sha256: body.fileSha256 || null } : {}),
  };
  const result = await admin.from("comics").update(update).eq("id", body.id);
  if (result.error) return res.status(409).json({ error: `Não foi possível salvar: ${result.error.message}` });
  if (Array.isArray(body.characters)) {
    await admin.from("comic_characters").delete().eq("comic_id", body.id);
    for (const name of [...new Set(body.characters.map((item: string) => item.trim()).filter(Boolean))] as string[]) {
      const existing = await admin.from("characters").select("id").eq("name", name).eq("publisher", body.series.publisher).maybeSingle();
      const character = existing.data ?? (await admin.from("characters").insert({ name, publisher: body.series.publisher }).select("id").single()).data;
      if (character) await admin.from("comic_characters").insert({ comic_id: body.id, character_id: character.id });
    }
  }
  return res.status(200).json({ id: body.id });
}
