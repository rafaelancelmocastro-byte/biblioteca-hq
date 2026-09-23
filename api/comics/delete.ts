import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireOwner } from "../_lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST" && req.method !== "DELETE") { res.setHeader("Allow", "POST, DELETE"); return res.status(405).json({ error: "Method Not Allowed" }); }
  if (!(await requireOwner(req, res))) return;
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(503).json({ error: "Banco indisponível." });
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  if (req.method === "DELETE") {
    const id = req.body?.id;
    if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: "Usuário inválido." });
    const header = req.headers.authorization;
    const token = (Array.isArray(header) ? header[0] : header)?.replace(/^Bearer\s+/i, "");
    const actor = token ? await admin.auth.getUser(token) : null;
    if (!actor?.data.user || actor.data.user.id === id) return res.status(403).json({ error: "Você não pode excluir sua própria conta." });
    const target = await admin.from("profiles").select("id,role").eq("id", id).maybeSingle();
    if (target.error || !target.data) return res.status(404).json({ error: "Usuário não encontrado." });
    if (target.data.role === "master") return res.status(403).json({ error: "Contas Master não podem ser excluídas por este painel." });
    const deleted = await admin.auth.admin.deleteUser(id);
    if (deleted.error) return res.status(409).json({ error: `Não foi possível excluir o usuário: ${deleted.error.message}` });
    return res.status(200).json({ deleted: true });
  }
  const ids = req.body?.ids;
  if (!Array.isArray(ids) || !ids.length || ids.length > 100 || ids.some((id) => typeof id !== "string" || !/^[a-f0-9-]{36}$/i.test(id))) return res.status(400).json({ error: "Seleção inválida." });
  const { data, error } = await admin.from("comics").update({ deleted_at: new Date().toISOString() }).in("id", ids).is("deleted_at", null).select("id");
  if (error) return res.status(400).json({ error: `Não foi possível excluir as HQs: ${error.message}` });
  return res.status(200).json({ deleted: data?.length ?? 0 });
}
