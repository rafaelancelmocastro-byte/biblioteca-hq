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
  const parentId = ["saga", "phase", "one_shot"].includes(body.bannerTone) && body.parentSeriesId ? String(body.parentSeriesId) : null;
  if (["phase", "one_shot"].includes(body.bannerTone) && !parentId) return res.status(400).json({ error: "Escolha a coleção principal desta fase ou obra fechada." });
  if (body.bannerTone === "collection" && /\bnovos?\s*52\b/i.test(body.title) && !parentId) return res.status(400).json({ error: "Os Novos 52 devem ser cadastrados como fase dentro da coleção do personagem ou equipe." });
  if (parentId) {
    if (parentId === body.id) return res.status(400).json({ error: "Uma saga não pode pertencer a si mesma." });
    const { data: parent, error: parentError } = await admin.from("series").select("id,publisher,banner_tone,parent_series_id").eq("id", parentId).is("deleted_at", null).maybeSingle();
    if (parentError || !parent || parent.parent_series_id || ["saga", "phase", "one_shot"].includes(parent.banner_tone) || parent.publisher.trim().toLowerCase() !== body.publisher.trim().toLowerCase()) return res.status(400).json({ error: "Selecione uma coleção principal da mesma editora." });
  }
  const record = {
    title: body.title.trim(), publisher: body.publisher.trim(), start_year: Number(body.startYear),
    end_year: body.endYear ? Number(body.endYear) : null,
    total_issues_expected: body.totalIssuesExpected ? Number(body.totalIssuesExpected) : null,
    description: body.description?.trim() ?? "", banner_tone: body.bannerTone ?? null,
    parent_series_id: parentId,
    ...(body.coverKey !== undefined ? { cover_key: body.coverKey || null } : {}),
  };
  const normalize = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, " ").trim();
  const { data: existingSeries } = await admin.from("series").select("id,title,publisher").is("deleted_at", null);
  const duplicate = (existingSeries ?? []).find((item) => item.id !== body.id && normalize(item.title) === normalize(record.title) && normalize(item.publisher) === normalize(record.publisher));
  if (duplicate) return res.status(409).json({ error: `A coleção “${duplicate.title}” já existe para esta editora.`, existing: duplicate });
  if (body.id) {
    const result = await admin.from("series").update(record).eq("id", body.id).select("id").single();
    if (result.error) return res.status(409).json({ error: result.error.code === "23505" ? "Já existe um agrupamento com este nome, editora e ano. Abra o cadastro existente para editá-lo." : "Não foi possível salvar o agrupamento." });
    return res.status(200).json({ id: result.data.id });
  }
  // Soft-deleted rows still occupy the database's unique (title, publisher, year) key.
  // Reuse the archived row so a collection can be recreated without a SQL error.
  const archived = await admin.from("series").select("id,cover_key").eq("title", record.title).eq("publisher", record.publisher).eq("start_year", record.start_year).not("deleted_at", "is", null).limit(1).maybeSingle();
  if (archived.error) return res.status(503).json({ error: "Não foi possível verificar agrupamentos anteriores." });
  if (archived.data) {
    const restored = await admin.from("series").update({ ...record, cover_key: record.cover_key || archived.data.cover_key, deleted_at: null }).eq("id", archived.data.id).select("id").single();
    if (restored.error) return res.status(409).json({ error: "Não foi possível recuperar o agrupamento anterior." });
    return res.status(200).json({ id: restored.data.id, restored: true });
  }
  const result = await admin.from("series").insert(record).select("id").single();
  if (result.error) return res.status(409).json({ error: result.error.code === "23505" ? "Já existe um agrupamento com este nome, editora e ano. Atualize a página e edite o cadastro existente." : "Não foi possível criar o agrupamento." });
  return res.status(201).json({ id: result.data.id });
}
