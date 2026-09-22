import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireOwner } from "../_lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Method Not Allowed" }); }
  if (!(await requireOwner(req, res))) return;
  const ids = req.body?.ids;
  if (!Array.isArray(ids) || !ids.length || ids.length > 100 || ids.some((id) => typeof id !== "string" || !/^[a-f0-9-]{36}$/i.test(id))) return res.status(400).json({ error: "Seleção inválida." });
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(503).json({ error: "Banco indisponível." });
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.from("comics").update({ deleted_at: new Date().toISOString() }).in("id", ids).is("deleted_at", null).select("id");
  if (error) return res.status(400).json({ error: `Não foi possível excluir as HQs: ${error.message}` });
  return res.status(200).json({ deleted: data?.length ?? 0 });
}
