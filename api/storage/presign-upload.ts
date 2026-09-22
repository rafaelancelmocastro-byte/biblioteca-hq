import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireOwner } from "../_lib/auth.js";
import { createR2Client, getR2Config } from "../_lib/r2.js";

const ALLOWED_FILES = {
  comic: ["application/pdf"],
  cover: ["image/jpeg", "image/png", "image/webp"],
} as const;

type UploadPurpose = keyof typeof ALLOWED_FILES;

function extensionFor(contentType: string): string {
  return contentType === "application/pdf" ? "pdf" : contentType.split("/")[1];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  if (!(await requireOwner(req, res))) return;

  const { fileName, contentType, purpose } = req.body ?? {};
  if (
    typeof fileName !== "string" ||
    fileName.length === 0 ||
    fileName.length > 180 ||
    (purpose !== "comic" && purpose !== "cover") ||
    typeof contentType !== "string" ||
    !ALLOWED_FILES[purpose as UploadPurpose].includes(contentType as never)
  ) {
    return res.status(400).json({ error: "Dados de upload inválidos." });
  }

  const config = getR2Config();
  if (!config) return res.status(503).json({ error: "Serviço de armazenamento indisponível." });

  const key = `${purpose === "comic" ? "comics" : "covers"}/${crypto.randomUUID()}.${extensionFor(contentType)}`;
  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    ContentType: contentType,
    Metadata: { original_filename: fileName.replace(/[^a-zA-Z0-9._ -]/g, "_") },
  });
  const uploadUrl = await getSignedUrl(createR2Client(config), command, { expiresIn: 600 });

  return res.status(200).json({ key, uploadUrl, expiresInSeconds: 600 });
}
