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
  if (Array.isArray(body.ids)) {
    const ids = [...new Set(body.ids.filter((id: unknown) => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id)))];
    if (!ids.length || ids.length !== body.ids.length || ids.length > 100) return res.status(400).json({ error: "Selecione de 1 a 100 edições válidas." });
    const fields = body.fields ?? {};
    const update: Record<string, unknown> = {};
    const textFields: Record<string, string> = { title: "title", synopsis: "synopsis" };
    const listFields: Record<string, string> = { writers: "writers", pencillers: "pencillers", colorists: "colorists", tags: "tags" };
    for (const [field, column] of Object.entries(textFields)) {
      if (Object.hasOwn(fields, field)) {
        if (typeof fields[field] !== "string" || (field === "title" && !fields[field].trim())) return res.status(400).json({ error: `Campo ${field} inválido.` });
        update[column] = fields[field].trim();
      }
    }
    for (const [field, column] of Object.entries(listFields)) {
      if (Object.hasOwn(fields, field)) {
        if (!Array.isArray(fields[field]) || fields[field].some((value: unknown) => typeof value !== "string")) return res.status(400).json({ error: `Campo ${field} inválido.` });
        update[column] = fields[field].map((value: string) => value.trim()).filter(Boolean);
      }
    }
    if (Object.hasOwn(fields, "year")) {
      const year = Number(fields.year);
      if (!Number.isInteger(year) || year < 1800 || year > 2200) return res.status(400).json({ error: "Ano inválido." });
      update.publication_year = year;
    }
    if (Object.hasOwn(fields, "contentType")) {
      if (!["comic", "graphic_novel", "manga", "manhwa", "book"].includes(fields.contentType)) return res.status(400).json({ error: "Formato inválido." });
      update.content_type = fields.contentType;
    }
    if (Object.hasOwn(fields, "readingDirection")) {
      if (!["ltr", "rtl"].includes(fields.readingDirection)) return res.status(400).json({ error: "Direção inválida." });
      update.reading_direction = fields.readingDirection;
    }
    if (!Object.keys(update).length && !Object.hasOwn(fields, "seriesId") && !Object.hasOwn(fields, "characters")) return res.status(400).json({ error: "Marque ao menos um campo para editar." });
    const characterNames = Object.hasOwn(fields, "characters") ? fields.characters : null;
    if (characterNames !== null && (!Array.isArray(characterNames) || characterNames.some((value: unknown) => typeof value !== "string"))) return res.status(400).json({ error: "Personagens inválidos." });
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return res.status(503).json({ error: "Banco de dados indisponível." });
    const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    if (Object.hasOwn(fields, "seriesId")) {
      if (typeof fields.seriesId !== "string") return res.status(400).json({ error: "Coleção inválida." });
      if (fields.seriesId) {
        const series = await admin.from("series").select("id,publisher").eq("id", fields.seriesId).maybeSingle();
        if (series.error || !series.data) return res.status(400).json({ error: "Coleção não encontrada." });
        update.series_id = series.data.id;
        update.publisher = series.data.publisher;
      } else update.series_id = null;
    }
    const result = Object.keys(update).length ? await admin.from("comics").update(update).in("id", ids).select("id") : await admin.from("comics").select("id").in("id", ids);
    if (result.error) return res.status(409).json({ error: `Não foi possível atualizar as edições: ${result.error.message}` });
    if (characterNames !== null && result.data?.length) {
      const comics = await admin.from("comics").select("id,publisher").in("id", result.data.map((item) => item.id));
      if (comics.error) return res.status(409).json({ error: `Metadados salvos, mas não foi possível consultar os personagens: ${comics.error.message}` });
      const names = [...new Set((characterNames as string[]).map((value) => value.trim()).filter(Boolean))];
      const characterIds = new Map<string, string>();
      for (const publisher of [...new Set((comics.data ?? []).map((comic) => comic.publisher))]) {
        for (const name of names) {
          const existing = await admin.from("characters").select("id").eq("name", name).eq("publisher", publisher).maybeSingle();
          if (existing.error) return res.status(409).json({ error: `Não foi possível consultar “${name}”: ${existing.error.message}` });
          const created = existing.data ? null : await admin.from("characters").insert({ name, publisher }).select("id").single();
          if (created?.error) return res.status(409).json({ error: `Não foi possível cadastrar “${name}”: ${created.error.message}` });
          characterIds.set(`${publisher}\0${name}`, (existing.data ?? created?.data)?.id);
        }
      }
      const cleared = await admin.from("comic_characters").delete().in("comic_id", result.data.map((item) => item.id));
      if (cleared.error) return res.status(409).json({ error: `Não foi possível atualizar os personagens: ${cleared.error.message}` });
      const links = (comics.data ?? []).flatMap((comic) => names.map((name) => ({ comic_id: comic.id, character_id: characterIds.get(`${comic.publisher}\0${name}`) }))).filter((link) => link.character_id);
      if (links.length) {
        const linked = await admin.from("comic_characters").insert(links);
        if (linked.error) return res.status(409).json({ error: `Não foi possível associar os personagens: ${linked.error.message}` });
      }
    }
    return res.status(200).json({ updated: result.data?.length ?? 0 });
  }
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
