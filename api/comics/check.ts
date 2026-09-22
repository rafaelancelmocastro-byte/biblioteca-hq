import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireOwner } from "../_lib/auth.js";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { createR2Client, getR2Config } from "../_lib/r2.js";

const normalize = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, " ").trim();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Method Not Allowed" }); }
  if (!(await requireOwner(req, res))) return;
  if (req.body?.action === "storage-status") {
    const ids = req.body?.ids;
    if (!Array.isArray(ids) || ids.length > 40 || ids.some((id) => typeof id !== "string" || !/^[a-f0-9-]{36}$/i.test(id))) return res.status(400).json({ error: "Lista de edições inválida." });
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const config = getR2Config();
    if (!url || !key || !config) return res.status(503).json({ error: "Storage indisponível." });
    const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await admin.from("comics").select("id,pdf_key").in("id", ids).is("deleted_at", null);
    if (error) return res.status(503).json({ error: "Não foi possível verificar arquivos." });
    const r2 = createR2Client(config);
    const entries: Array<[string, string]> = [];
    for (let offset = 0; offset < (data ?? []).length; offset += 8) {
      const chunk = (data ?? []).slice(offset, offset + 8);
      entries.push(...await Promise.all(chunk.map(async (row): Promise<[string, string]> => {
        if (!row.pdf_key) return [row.id, "pending"];
        try { await r2.send(new HeadObjectCommand({ Bucket: config.bucketName, Key: row.pdf_key })); return [row.id, "present"]; }
        catch { return [row.id, "error"]; }
      })));
    }
    return res.status(200).json({ statuses: Object.fromEntries(entries) });
  }
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
