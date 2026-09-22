import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import dotenv from "dotenv";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

dotenv.config({ path: ".env.production.local", quiet: true });
const { VITE_SUPABASE_URL: supabaseUrl, SUPABASE_SERVICE_ROLE_KEY: databaseKey, R2_ACCESS_KEY_ID: accessKeyId, R2_SECRET_ACCESS_KEY: secretAccessKey, R2_ENDPOINT: endpoint, R2_BUCKET_NAME: bucketName } = process.env;
if (![supabaseUrl, databaseKey, bucketName].every(Boolean)) throw new Error("Configuração de produção incompleta.");

const headers = { apikey: databaseKey, Authorization: `Bearer ${databaseKey}` };
const databaseResponse = await fetch(`${supabaseUrl}/rest/v1/comics?select=id,cover_key,cover_thumb_key&deleted_at=is.null&limit=1000`, { headers });
if (!databaseResponse.ok) throw new Error(`Catálogo indisponível: ${databaseResponse.status}`);
const records = (await databaseResponse.json()).filter((row) => row.cover_key && !row.cover_thumb_key);
const useR2Credentials = Boolean(accessKeyId && accessKeyId.length === 32 && secretAccessKey && endpoint);
const r2 = useR2Credentials ? new S3Client({ region: "auto", endpoint, credentials: { accessKeyId, secretAccessKey } }) : null;

function wrangler(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["wrangler", "r2", "object", ...args], { shell: true, stdio: ["ignore", "pipe", "pipe"] });
    const chunks = [];
    let stderr = "";
    child.stdout.on("data", (chunk) => chunks.push(chunk));
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    const timeout = setTimeout(() => { child.kill(); reject(new Error("Wrangler excedeu 45 segundos.")); }, 45000);
    child.on("close", (code) => { clearTimeout(timeout); code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(stderr || `Wrangler encerrou com código ${code}`)); });
  });
}

function resizeImage(input) {
  return new Promise((resolve, reject) => {
    const script = `import io,sys\nfrom PIL import Image,ImageOps\nimage=Image.open(io.BytesIO(sys.stdin.buffer.read()))\nimage=ImageOps.exif_transpose(image).convert('RGB')\nimage.thumbnail((420,840))\nbuf=io.BytesIO()\nimage.save(buf,format='WEBP',quality=78,method=5)\nsys.stdout.buffer.write(buf.getvalue())`;
    const child = spawn("python", ["-c", script], { stdio: ["pipe", "pipe", "pipe"] });
    const chunks = [];
    let stderr = "";
    child.stdout.on("data", (chunk) => chunks.push(chunk));
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(stderr || `Pillow encerrou com código ${code}`)));
    child.stdin.end(input);
  });
}

let success = 0;
let failed = 0;
for (const row of records.slice(0, process.argv[2] ? Number(process.argv[2]) : undefined)) {
  const sourceFile = join(tmpdir(), `biblioteca-cover-${randomUUID()}.img`);
  const thumbFile = join(tmpdir(), `biblioteca-thumb-${randomUUID()}.webp`);
  try {
    if (!/^covers\/[a-f0-9-]+\.(jpe?g|png|webp)$/i.test(row.cover_key)) throw new Error("Chave da capa fora do padrão esperado.");
    if (!r2) await wrangler(["get", `${bucketName}/${row.cover_key}`, "--remote", "--file", sourceFile]);
    const original = r2
      ? Buffer.from(await (await r2.send(new GetObjectCommand({ Bucket: bucketName, Key: row.cover_key }))).Body.transformToByteArray())
      : await readFile(sourceFile);
    const thumbnail = await resizeImage(original);
    const key = `covers/${randomUUID()}.webp`;
    if (r2) await r2.send(new PutObjectCommand({ Bucket: bucketName, Key: key, Body: thumbnail, ContentType: "image/webp", CacheControl: "private, max-age=900" }));
    else { await writeFile(thumbFile, thumbnail); await wrangler(["put", `${bucketName}/${key}`, "--remote", "--file", thumbFile, "--content-type", "image/webp", "--force"]); }
    const update = await fetch(`${supabaseUrl}/rest/v1/comics?id=eq.${row.id}&cover_thumb_key=is.null`, { method: "PATCH", headers: { ...headers, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ cover_thumb_key: key }) });
    if (!update.ok) throw new Error(`Falha ao associar thumbnail: ${update.status}`);
    success++;
  } catch (error) {
    failed++;
    console.error(`Falha na capa da HQ ${row.id}: ${error.message}`);
  }
  finally { await Promise.allSettled([unlink(sourceFile), unlink(thumbFile)]); }
}
console.log(JSON.stringify({ total: records.length, success, failed }));
