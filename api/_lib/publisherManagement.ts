import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireOwner } from "./auth.js";
import { createR2Client, getR2Config } from "./r2.js";

const validName = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0 && value.trim().length <= 100;
const validLogo = (value: unknown): value is string => typeof value === "string" && (value === "" || /^covers\/[a-f0-9-]+\.(?:jpe?g|png|webp)$/i.test(value));

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Method Not Allowed" }); }
  if (!(await requireOwner(req, res))) return;
  const { publisherAction: action, originalName, name, logoKey } = req.body ?? {};
  if (!["create", "update", "delete"].includes(action) || (action !== "create" && !validName(originalName)) || (action !== "delete" && (!validName(name) || !validLogo(logoKey)))) return res.status(400).json({ error: "Dados da editora inválidos." });
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(503).json({ error: "Banco indisponível." });
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const oldName = typeof originalName === "string" ? originalName.trim() : "";
  const nextName = typeof name === "string" ? name.trim() : "";

  const cleanupLogo = async (oldKey: string) => {
    if (!oldKey || oldKey === logoKey) return;
    const [publishers, series, comics, thumbnails] = await Promise.all([
      admin.from("publisher_assets").select("publisher", { count: "exact", head: true }).eq("logo_key", oldKey),
      admin.from("series").select("id", { count: "exact", head: true }).eq("cover_key", oldKey),
      admin.from("comics").select("id", { count: "exact", head: true }).eq("cover_key", oldKey),
      admin.from("comics").select("id", { count: "exact", head: true }).eq("cover_thumb_key", oldKey),
    ]);
    if ([publishers, series, comics, thumbnails].some((result) => result.error || result.count)) return;
    const config = getR2Config();
    if (config) try { await createR2Client(config).send(new DeleteObjectCommand({ Bucket: config.bucketName, Key: oldKey })); } catch (error) { console.warn("Logo antigo não removido do armazenamento", error); }
  };

  if (action === "create") {
    const { data: existing } = await admin.from("publisher_assets").select("publisher").ilike("publisher", nextName).maybeSingle();
    const [series, comics, characters] = await Promise.all([
      admin.from("series").select("id", { count: "exact", head: true }).ilike("publisher", nextName).is("deleted_at", null),
      admin.from("comics").select("id", { count: "exact", head: true }).ilike("publisher", nextName).is("deleted_at", null),
      admin.from("characters").select("id", { count: "exact", head: true }).ilike("publisher", nextName),
    ]);
    if ([series, comics, characters].some((result) => result.error)) return res.status(503).json({ error: "Não foi possível verificar a editora." });
    if (existing || series.count || comics.count || characters.count) return res.status(409).json({ error: "Esta editora já existe. Abra-a para editar." });
    const { error } = await admin.from("publisher_assets").insert({ publisher: nextName, logo_key: logoKey });
    return error ? res.status(400).json({ error: error.message }) : res.status(200).json({ publisher: nextName });
  }

  const { data: oldAsset, error: assetError } = await admin.from("publisher_assets").select("publisher,logo_key").eq("publisher", oldName).maybeSingle();
  if (assetError) return res.status(503).json({ error: "Não foi possível carregar a editora." });
  const [oldSeries, oldComics, oldCharacters] = await Promise.all([
    admin.from("series").select("id", { count: "exact", head: true }).eq("publisher", oldName).is("deleted_at", null),
    admin.from("comics").select("id", { count: "exact", head: true }).eq("publisher", oldName).is("deleted_at", null),
    admin.from("characters").select("id", { count: "exact", head: true }).eq("publisher", oldName),
  ]);
  if ([oldSeries, oldComics, oldCharacters].some((result) => result.error)) return res.status(503).json({ error: "Não foi possível verificar os vínculos da editora." });
  if (!oldAsset && !oldSeries.count && !oldComics.count && !oldCharacters.count) return res.status(404).json({ error: "Editora não encontrada." });

  if (action === "delete") {
    if (oldSeries.count || oldComics.count || oldCharacters.count) return res.status(409).json({ error: `A editora tem ${oldSeries.count || 0} coleção(ões), ${oldComics.count || 0} edição(ões) e ${oldCharacters.count || 0} personagem(ns). Reorganize esses itens antes de excluí-la.` });
    if (oldAsset) {
      const { error } = await admin.from("publisher_assets").delete().eq("publisher", oldName);
      if (error) return res.status(400).json({ error: error.message });
      await cleanupLogo(oldAsset.logo_key);
    }
    return res.status(200).json({ deleted: true });
  }

  if (nextName.toLocaleLowerCase("pt-BR") !== oldName.toLocaleLowerCase("pt-BR")) {
    const [targetAsset, targetSeries, targetComics, targetCharacters] = await Promise.all([
      admin.from("publisher_assets").select("publisher").ilike("publisher", nextName).maybeSingle(),
      admin.from("series").select("id", { count: "exact", head: true }).ilike("publisher", nextName).is("deleted_at", null),
      admin.from("comics").select("id", { count: "exact", head: true }).ilike("publisher", nextName).is("deleted_at", null),
      admin.from("characters").select("id", { count: "exact", head: true }).ilike("publisher", nextName),
    ]);
    if ([targetAsset, targetSeries, targetComics, targetCharacters].some((result) => result.error)) return res.status(503).json({ error: "Não foi possível verificar o novo nome da editora." });
    if (targetAsset.data || targetSeries.count || targetComics.count || targetCharacters.count) return res.status(409).json({ error: "Já existe uma editora com esse nome." });
    const created = await admin.from("publisher_assets").insert({ publisher: nextName, logo_key: logoKey });
    if (created.error) return res.status(400).json({ error: created.error.message });
    const updated: string[] = [];
    for (const table of ["series", "comics", "characters"] as const) {
      const result = await admin.from(table).update({ publisher: nextName }).eq("publisher", oldName);
      if (result.error) {
        for (const completed of updated.reverse()) await admin.from(completed).update({ publisher: oldName }).eq("publisher", nextName);
        await admin.from("publisher_assets").delete().eq("publisher", nextName);
        return res.status(400).json({ error: `Não foi possível renomear a editora: ${result.error.message}` });
      }
      updated.push(table);
    }
    if (oldAsset) {
      const removed = await admin.from("publisher_assets").delete().eq("publisher", oldName);
      if (removed.error) {
        for (const completed of updated.reverse()) await admin.from(completed).update({ publisher: oldName }).eq("publisher", nextName);
        await admin.from("publisher_assets").delete().eq("publisher", nextName);
        return res.status(503).json({ error: "Não foi possível concluir a renomeação. Tente novamente." });
      }
      await cleanupLogo(oldAsset.logo_key);
    }
  } else {
    const { error } = await admin.from("publisher_assets").upsert({ publisher: oldName, logo_key: logoKey }, { onConflict: "publisher" });
    if (error) return res.status(400).json({ error: error.message });
    if (oldAsset) await cleanupLogo(oldAsset.logo_key);
  }
  return res.status(200).json({ publisher: nextName });
}
