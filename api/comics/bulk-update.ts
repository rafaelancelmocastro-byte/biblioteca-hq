import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireOwner } from "../_lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "PATCH") {
    res.setHeader("Allow", "PATCH");
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  if (!(await requireOwner(req, res))) return;

  const body = req.body ?? {};
  if (typeof body.seriesId !== "string" || !body.seriesId.trim()) {
    return res.status(400).json({ error: "Selecione uma coleção válida." });
  }

  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(503).json({ error: "Banco de dados indisponível." });

  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const sharedMetadata = {
    synopsis: typeof body.synopsis === "string" ? body.synopsis.trim() : "",
    writers: Array.isArray(body.writers) ? body.writers : [],
    pencillers: Array.isArray(body.pencillers) ? body.pencillers : [],
    colorists: Array.isArray(body.colorists) ? body.colorists : [],
    tags: Array.isArray(body.tags) ? body.tags : [],
  };
  const result = await admin.from("comics").update(sharedMetadata).eq("series_id", body.seriesId).select("id");
  if (result.error) return res.status(409).json({ error: `Não foi possível atualizar a coleção: ${result.error.message}` });
  return res.status(200).json({ updated: result.data?.length ?? 0 });
}
