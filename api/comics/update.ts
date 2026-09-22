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
    publication_year: Number(body.year),
    publisher: body.series.publisher,
    total_pages: Number(body.totalPages),
    synopsis: body.synopsis?.trim() ?? "",
    writers: Array.isArray(body.writers) ? body.writers : [],
    pencillers: Array.isArray(body.pencillers) ? body.pencillers : [],
    colorists: Array.isArray(body.colorists) ? body.colorists : [],
    tags: Array.isArray(body.tags) ? body.tags : [],
    file_name: body.fileName,
    file_size_mb: Number(body.fileSizeMb || 0),
    pdf_key: body.pdfKey,
    cover_key: body.coverKey || null,
  };
  const result = await admin.from("comics").update(update).eq("id", body.id);
  if (result.error) return res.status(409).json({ error: `Não foi possível salvar: ${result.error.message}` });
  return res.status(200).json({ id: body.id });
}
