import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireOwner } from "../_lib/auth.js";
import { createR2Client, getR2Config } from "../_lib/r2.js";

function isAllowedKey(value: unknown): value is string {
  return typeof value === "string" && /^(?:comics\/[a-f0-9-]+\.(?:pdf|cbr|cbz|epub|azw3)|covers\/[a-f0-9-]+\.(?:jpeg|jpg|png|webp))$/i.test(value);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  if (!(await requireOwner(req, res))) return;

  const { key } = req.body ?? {};
  if (!isAllowedKey(key)) return res.status(400).json({ error: "Chave de arquivo inválida." });

  const config = getR2Config();
  if (!config) return res.status(503).json({ error: "Serviço de armazenamento indisponível." });

  const readUrl = await getSignedUrl(
    createR2Client(config),
    new GetObjectCommand({ Bucket: config.bucketName, Key: key }),
    { expiresIn: 3600 }
  );

  return res.status(200).json({ key, readUrl, expiresInSeconds: 3600 });
}
