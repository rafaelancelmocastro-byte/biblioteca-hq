// One-time catalog repair. Run with --apply after reviewing the dry run.
import dotenv from "dotenv";
import ws from "ws";
import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

dotenv.config({ path: ".env.production.local", quiet: true });
globalThis.WebSocket = ws;
const apply = process.argv.includes("--apply");
const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const read = async (table) => {
  const { data, error } = await db.from(table).select("*").is("deleted_at", null);
  if (error) throw error;
  return data;
};
const series = await read("series");
const comics = await read("comics");
const normalize = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const find = (publisher, title) => series.find((item) => normalize(item.publisher) === normalize(publisher) && normalize(item.title) === normalize(title));
const actions = [];
async function updateSeries(item, patch) {
  if (!item) throw new Error("Agrupamento esperado não encontrado.");
  actions.push(`Agrupamento: ${item.publisher} / ${item.title} → ${JSON.stringify(patch)}`);
  if (!apply) return;
  const { error } = await db.from("series").update(patch).eq("id", item.id);
  if (error) throw error;
  Object.assign(item, patch);
}
async function ensureSeries(publisher, title, startYear, kind = "collection", parent = null) {
  let item = find(publisher, title);
  if (item) return item;
  actions.push(`Criar: ${publisher} / ${title} (${kind})`);
  if (!apply) return { id: `preview:${title}`, title, publisher, start_year: startYear, banner_tone: kind, parent_series_id: parent?.id ?? null };
  const { data, error } = await db.from("series").insert({ publisher, title, start_year: startYear, banner_tone: kind, parent_series_id: parent?.id ?? null, description: "" }).select("*").single();
  if (error) throw error;
  series.push(data);
  return data;
}
async function moveComics(source, target, predicate = () => true) {
  if (!source || !target) throw new Error("Origem ou destino ausente.");
  const selected = comics.filter((comic) => comic.series_id === source.id && predicate(comic));
  actions.push(`Mover ${selected.length} edição(ões): ${source.title} → ${target.title}`);
  if (!apply || !selected.length) return;
  const { data, error } = await db.from("comics").update({ series_id: target.id, publisher: target.publisher }).in("id", selected.map((comic) => comic.id)).eq("series_id", source.id).select("id");
  if (error || data?.length !== selected.length) throw error || new Error(`A migração de ${source.title} ficou incompleta.`);
  selected.forEach((comic) => { comic.series_id = target.id; comic.publisher = target.publisher; });
}
async function archiveEmpty(item) {
  if (!apply) { actions.push(`Arquivar agrupamento vazio após migração: ${item.title}`); return; }
  if (comics.some((comic) => comic.series_id === item.id) || series.some((other) => other.parent_series_id === item.id)) throw new Error(`Não é seguro remover ${item.title}: há conteúdo vinculado.`);
  actions.push(`Arquivar agrupamento vazio: ${item.title}`);
  if (!apply) return;
  const { error } = await db.from("series").update({ deleted_at: new Date().toISOString() }).eq("id", item.id);
  if (error) throw error;
}

if (apply) {
  const directory = resolve(".local-backups");
  await mkdir(directory, { recursive: true });
  const filename = resolve(directory, `catalog-before-hierarchy-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  await writeFile(filename, JSON.stringify({ series, comics }, null, 2));
  console.log(`Backup local: ${filename}`);
}

const dc = "DC Comics";
const aquaman = find(dc, "Aquaman");
const aquaman52 = find(dc, "Os Novos 52! Aquaman");
await updateSeries(aquaman52, { banner_tone: "phase", parent_series_id: aquaman.id });
await moveComics(aquaman, aquaman52, (comic) => normalize(comic.title).includes("novos 52 aquaman"));

const superman = find(dc, "Superman");
await updateSeries(find(dc, "Os Novos 52! Superman"), { banner_tone: "phase", parent_series_id: superman.id });
await updateSeries(find(dc, "O Retorno do Super Homem"), { title: "O Retorno do Superman", banner_tone: "saga", parent_series_id: superman.id });
const legacy = await ensureSeries(dc, "Superman: O Legado das Estrelas", 2002, "saga", superman);
await moveComics(superman, legacy, (comic) => normalize(comic.title).includes("legado das estrelas"));

const league52 = find(dc, "Os Novos 52! Liga da Justiça");
const league = await ensureSeries(dc, "Liga da Justiça", 2011);
await updateSeries(league52, { banner_tone: "phase", parent_series_id: league.id, start_year: 2011 });
await updateSeries(find(dc, "Liga da Justiça - A Guerra de Darkseid"), { parent_series_id: league.id });

const harley52 = find(dc, "Os Novos 52! Arlequina");
const harley = await ensureSeries(dc, "Arlequina", 2014);
await updateSeries(harley52, { banner_tone: "phase", parent_series_id: harley.id });

const batman = await ensureSeries(dc, "Batman", 1983);
const killingJoke = await ensureSeries(dc, "Batman: A Piada Mortal", 1988, "one_shot", batman);
const generic = find(dc, "Graphic Novel");
await moveComics(generic, killingJoke, (comic) => normalize(comic.title).includes("piada mortal"));
await archiveEmpty(generic);

const marvel = "Marvel";
const avengers = find(marvel, "Vingadores");
await updateSeries(find(marvel, "Vingadores - A Iniciativa"), { banner_tone: "phase", parent_series_id: avengers.id });
await updateSeries(find(marvel, "Vinagadores Origens"), { title: "Vingadores: Origens", banner_tone: "saga", parent_series_id: avengers.id });
const avengers2018 = await ensureSeries(marvel, "Vingadores (2018)", 2018, "phase", avengers);
await moveComics(avengers, avengers2018, (comic) => normalize(comic.title) === "vingadores 2018");
const warlock = await ensureSeries(marvel, "Warlock", 2023);
await updateSeries(find(marvel, "Warlock - Renascimento"), { banner_tone: "saga", parent_series_id: warlock.id });
const xmen = await ensureSeries(marvel, "X-Men", 2015);
await updateSeries(find(marvel, "Extraordinários X-Men"), { banner_tone: "phase", parent_series_id: xmen.id });

console.log(actions.join("\n"));
console.log(`${actions.length} ações ${apply ? "aplicadas" : "planejadas"}; ${comics.length} edições ativas preservadas.`);
