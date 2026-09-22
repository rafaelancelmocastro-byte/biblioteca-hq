import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireOwner } from "../_lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Method Not Allowed" }); }
  if (!(await requireOwner(req, res))) return;
  const body = req.body ?? {};
  if (!body.title?.trim() || !body.publisher?.trim() || !Number.isInteger(Number(body.startYear))) return res.status(400).json({ error: "Dados da coleção inválidos." });
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(503).json({ error: "Banco de dados indisponível." });
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const record = {
    title: body.title.trim(), publisher: body.publisher.trim(), start_year: Number(body.startYear),
    end_year: body.endYear ? Number(body.endYear) : null,
    total_issues_expected: body.totalIssuesExpected ? Number(body.totalIssuesExpected) : null,
    description: body.description?.trim() ?? "", banner_tone: body.bannerTone ?? null,
  };
  const normalize = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, " ").trim();
  const { data: existingSeries } = await admin.from("series").select("id,title,publisher").is("deleted_at", null);
  const duplicate = (existingSeries ?? []).find((item) => item.id !== body.id && normalize(item.title) === normalize(record.title) && normalize(item.publisher) === normalize(record.publisher));
  if (duplicate) return res.status(409).json({ error: `A coleção “${duplicate.title}” já existe para esta editora.`, existing: duplicate });
  if (body.id) {
    const result = await admin.from("series").update(record).eq("id", body.id).select("id").single();
    if (result.error) return res.status(409).json({ error: result.error.message });
    return res.status(200).json({ id: result.data.id });
  }
  const result = await admin.from("series").insert(record).select("id").single();
  if (result.error) return res.status(409).json({ error: result.error.message });
  return res.status(201).json({ id: result.data.id });
}
