import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireUser } from "../_lib/user.js";
import { createR2Client, getR2Config } from "../_lib/r2.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST" && req.method !== "GET") { res.setHeader("Allow", "GET, POST"); return res.status(405).json({ error: "Method Not Allowed" }); }
  const auth = await requireUser(req, res);
  if (!auth) return;
  const profile = await auth.admin.from("profiles").select("role,is_active,access_status").eq("id", auth.user.id).maybeSingle();
  if (profile.error || !profile.data || !profile.data.is_active || (profile.data.role !== "master" && profile.data.access_status !== "lifetime")) {
    return res.status(403).json({ error: "Acesso à leitura pendente de liberação." });
  }
  const comicId = req.method === "GET" ? req.query.comicId : req.body?.comicId;
  if (typeof comicId !== "string" || !/^[a-f0-9-]{36}$/i.test(comicId)) return res.status(400).json({ error: "Edição inválida." });
  const config = getR2Config();
  if (!config) return res.status(503).json({ error: "Armazenamento indisponível." });
  const { data, error } = await auth.admin.from("comics").select("pdf_key,deleted_at").eq("id", comicId).maybeSingle();
  if (error || !data || data.deleted_at || !/^comics\/[a-f0-9-]+\.(pdf|cbr|cbz|epub|azw3)$/i.test(data.pdf_key || "")) {
    console.warn("Tentativa de acesso a HQ inexistente ou removida", { comicId, userId: auth.user.id });
    return res.status(404).json({ error: "Edição indisponível." });
  }
  if (req.method === "GET") {
    const start = Number(req.query.start);
    const end = Number(req.query.end);
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || end - start >= 2 * 1024 * 1024) {
      return res.status(400).json({ error: "Trecho de arquivo inválido." });
    }
    try {
      const object = await createR2Client(config).send(new GetObjectCommand({ Bucket: config.bucketName, Key: data.pdf_key, Range: `bytes=${start}-${end}` }));
      const bytes = await object.Body?.transformToByteArray();
      if (!bytes || !object.ContentRange) return res.status(502).json({ error: "Não foi possível baixar este trecho." });
      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Content-Range", object.ContentRange);
      return res.status(206).send(Buffer.from(bytes));
    } catch (cause) {
      console.error("Falha ao ler trecho do R2", { comicId, start, end, cause });
      return res.status(502).json({ error: "Falha ao baixar a edição. Tente novamente." });
    }
  }
  const readUrl = await getSignedUrl(createR2Client(config), new GetObjectCommand({ Bucket: config.bucketName, Key: data.pdf_key }), { expiresIn: 1800 });
  res.setHeader("Cache-Control", "private, no-store");
  return res.status(200).json({ readUrl, expiresInSeconds: 1800 });
}
