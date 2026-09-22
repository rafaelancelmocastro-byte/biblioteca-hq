import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireOwner } from "../_lib/auth.js";

const normalize = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, " ").trim();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Method Not Allowed" }); }
  if (!(await requireOwner(req, res))) return;
  const { title, seriesId, issueNumber, year, volume, publisher, fileSha256 } = req.body ?? {};
  if (typeof title !== "string" || typeof seriesId !== "string" || typeof publisher !== "string" || !Number.isInteger(issueNumber) || !Number.isInteger(year)) return res.status(400).json({ error: "Metadados insuficientes para a verificação." });
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(503).json({ error: "Banco indisponível." });
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  if (typeof fileSha256 === "string" && /^[a-f0-9]{64}$/i.test(fileSha256)) {
    const { data } = await admin.from("comics").select("id,title").eq("file_sha256", fileSha256).is("deleted_at", null).limit(1).maybeSingle();
    if (data) return res.status(200).json({ code: "SAME_FILE", existing: data, message: "Este mesmo arquivo já está cadastrado." });
  }
  const { data, error } = await admin.from("comics").select("id,title,volume,publisher").eq("series_id", seriesId).eq("issue_number", issueNumber).eq("publication_year", year).is("deleted_at", null);
  if (error) return res.status(503).json({ error: "Não foi possível verificar duplicidades." });
  const match = (data ?? []).find((item) => (item.volume ?? null) === (volume ?? null) && normalize(item.title) === normalize(title) && normalize(item.publisher) === normalize(publisher));
  return res.status(200).json(match ? { code: "POSSIBLE_DUPLICATE", existing: match, message: "Já existe uma edição com esta combinação editorial." } : { code: "UNIQUE" });
}
