import "dotenv/config";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const sourceDir = resolve(
  process.env.USERPROFILE,
  "Desktop",
  "HQ MARVEL",
  "X-MEN",
  "Extraordinários X-men_",
  "2015",
);
const coverDir = resolve(".tmp-covers", "import");
mkdirSync(coverDir, { recursive: true });

const required = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];
for (const name of required) {
  if (!process.env[name]) throw new Error(`Variável ausente: ${name}`);
}
if (!existsSync(sourceDir)) throw new Error(`Pasta não encontrada: ${sourceDir}`);

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: WebSocket },
});
const publicClient = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: WebSocket },
});
const apiBase = process.env.IMPORT_API_BASE ?? "https://biblioteca-hq.vercel.app";

const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
  type: "magiclink",
  email: "rafaelancelmo.castro@gmail.com",
});
if (linkError) throw linkError;
const { data: sessionData, error: sessionError } = await publicClient.auth.verifyOtp({
  token_hash: linkData.properties.hashed_token,
  type: "magiclink",
});
if (sessionError || !sessionData.session) throw sessionError ?? new Error("Sessão de importação indisponível.");
const accessToken = sessionData.session.access_token;

function issueFor(fileName) {
  if (/^Anual 01\.pdf$/i.test(fileName)) return { issue: 1, annual: true };
  if (/^Capítulo 05\.pdf$/i.test(fileName)) return { issue: 3, annual: false };
  if (/^Capítulo 05\(1\)\.pdf$/i.test(fileName)) return { issue: 5, annual: false };
  const match = fileName.match(/Capítulo\s+(\d+)/i);
  return match ? { issue: Number(match[1]), annual: false } : null;
}

function pageCount(pdfPath) {
  const output = execFileSync("pdfinfo", [pdfPath], { encoding: "utf8" });
  const match = output.match(/^Pages:\s+(\d+)/m);
  if (!match) throw new Error(`Não foi possível ler o total de páginas de ${basename(pdfPath)}`);
  return Number(match[1]);
}

function renderCover(pdfPath, outputBase) {
  execFileSync("pdftoppm", [
    "-f", "1", "-singlefile", "-jpeg", "-jpegopt", "quality=82", "-scale-to", "1400", pdfPath, outputBase,
  ]);
  return `${outputBase}.jpg`;
}

async function getOrCreateSeries(annual) {
  const title = annual ? "Extraordinários X-Men — Anual" : "Extraordinários X-Men";
  const { data: existing, error: lookupError } = await supabase
    .from("series")
    .select("id")
    .eq("title", title)
    .eq("publisher", "Marvel")
    .eq("start_year", 2015)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (existing) return existing.id;

  const { data, error } = await supabase.from("series").insert({
    title,
    publisher: "Marvel",
    start_year: 2015,
    end_year: annual ? 2015 : 2017,
    total_issues_expected: annual ? 1 : 20,
    description: annual
      ? "Edição anual da série Extraordinários X-Men."
      : "Série dos X-Men publicada pela Marvel a partir de 2015.",
    banner_tone: annual ? "#7f1d1d" : "#b91c1c",
  }).select("id").single();
  if (error) throw error;
  return data.id;
}

async function upload(path, contentType, purpose) {
  const requestWithRetry = async (url, init, label) => {
    let lastError;
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      try {
        const response = await fetch(url, init);
        if (response.ok || response.status < 500) return response;
        lastError = new Error(`${label}: HTTP ${response.status}`);
      } catch (error) {
        lastError = error;
      }
      await new Promise((resolveDelay) => setTimeout(resolveDelay, attempt * 1500));
    }
    throw lastError;
  };
  const presignResponse = await requestWithRetry(`${apiBase}/api/storage/presign-upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ fileName: basename(path), contentType, purpose }),
  }, "Falha ao autorizar upload");
  if (!presignResponse.ok) throw new Error(`Falha ao autorizar upload: ${await presignResponse.text()}`);
  const { uploadUrl, key } = await presignResponse.json();
  const uploadResponse = await requestWithRetry(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: readFileSync(path),
  }, "Falha no envio ao R2");
  if (!uploadResponse.ok) throw new Error(`Falha no upload para o R2: HTTP ${uploadResponse.status}`);
  return key;
}

const files = readdirSync(sourceDir)
  .filter((name) => name.toLowerCase().endsWith(".pdf"))
  .map((name) => ({ name, metadata: issueFor(name) }))
  .filter((item) => item.metadata)
  .sort((a, b) => Number(a.metadata.annual) - Number(b.metadata.annual) || a.metadata.issue - b.metadata.issue);

let imported = 0;
let skipped = 0;
for (const item of files) {
  const { issue, annual } = item.metadata;
  const seriesId = await getOrCreateSeries(annual);
  const { data: existing, error: existingError } = await supabase
    .from("comics")
    .select("id")
    .eq("series_id", seriesId)
    .eq("issue_number", issue)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) {
    console.log(`IGNORADO ${annual ? "Anual " : ""}#${String(issue).padStart(3, "0")} (já existe)`);
    skipped += 1;
    continue;
  }

  const pdfPath = join(sourceDir, item.name);
  const pages = pageCount(pdfPath);
  const id = randomUUID();
  const coverPath = renderCover(pdfPath, join(coverDir, id));
  console.log(`ENVIANDO ${annual ? "Anual " : ""}#${String(issue).padStart(3, "0")} (${pages} páginas)`);
  const pdfKey = await upload(pdfPath, "application/pdf", "comic");
  const coverKey = await upload(coverPath, "image/jpeg", "cover");

  const { error } = await supabase.from("comics").insert({
    id,
    series_id: seriesId,
    title: annual ? "Extraordinários X-Men — Anual #001" : `Extraordinários X-Men #${String(issue).padStart(3, "0")}`,
    issue_number: issue,
    publication_year: annual ? 2016 : 2015,
    publisher: "Marvel",
    total_pages: pages,
    synopsis: "",
    writers: [],
    pencillers: [],
    colorists: [],
    tags: annual ? ["X-Men", "Marvel", "Anual"] : ["X-Men", "Marvel"],
    file_size_mb: Number((statSync(pdfPath).size / 1024 / 1024).toFixed(2)),
    file_name: item.name,
    pdf_key: pdfKey,
    cover_key: coverKey,
  });
  if (error) throw error;
  imported += 1;
  console.log(`OK ${annual ? "Anual " : ""}#${String(issue).padStart(3, "0")}`);
}

console.log(JSON.stringify({ imported, skipped, total: files.length }));
