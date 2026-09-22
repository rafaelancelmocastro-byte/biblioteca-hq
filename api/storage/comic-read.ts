import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireUser } from "../_lib/user.js";
import { createR2Client, getR2Config } from "../_lib/r2.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Method Not Allowed" }); }
  const auth = await requireUser(req, res);
  if (!auth) return;
  const comicId = req.body?.comicId;
  if (typeof comicId !== "string" || !/^[a-f0-9-]{36}$/i.test(comicId)) return res.status(400).json({ error: "Edição inválida." });
  const config = getR2Config();
  if (!config) return res.status(503).json({ error: "Armazenamento indisponível." });
  const { data, error } = await auth.admin.from("comics").select("pdf_key,deleted_at").eq("id", comicId).maybeSingle();
  if (error || !data || data.deleted_at || !/^comics\/[a-f0-9-]+\.pdf$/i.test(data.pdf_key || "")) {
    console.warn("Tentativa de acesso a HQ inexistente ou removida", { comicId, userId: auth.user.id });
    return res.status(404).json({ error: "Edição indisponível." });
  }
  const readUrl = await getSignedUrl(createR2Client(config), new GetObjectCommand({ Bucket: config.bucketName, Key: data.pdf_key, ResponseCacheControl: "private, no-store" }), { expiresIn: 1800 });
  res.setHeader("Cache-Control", "private, no-store");
  return res.status(200).json({ readUrl, expiresInSeconds: 1800 });
}
