import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireOwner } from "../_lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Method Not Allowed" }); }
  if (!(await requireOwner(req, res))) return;
  const { id, deleteContents } = req.body ?? {};
  if (typeof id !== "string" || !/^[a-f0-9-]{36}$/i.test(id) || typeof deleteContents !== "boolean") return res.status(400).json({ error: "Agrupamento inválido." });
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(503).json({ error: "Banco indisponível." });
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const stamp = new Date().toISOString();
  const affected = deleteContents
    ? await admin.from("comics").update({ deleted_at: stamp }).eq("series_id", id).is("deleted_at", null)
    : await admin.from("comics").update({ series_id: null }).eq("series_id", id).is("deleted_at", null);
  if (affected.error) return res.status(400).json({ error: `Não foi possível atualizar as edições: ${affected.error.message}` });
  const result = await admin.from("series").update({ deleted_at: stamp }).eq("id", id).is("deleted_at", null);
  if (result.error) return res.status(400).json({ error: `Não foi possível excluir o agrupamento: ${result.error.message}` });
  return res.status(200).json({ deleted: true });
}
