import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireOwner } from "../_lib/auth.js";
import { createR2Client, getR2Config } from "../_lib/r2.js";

const ALLOWED_FILES = {
  comic: ["application/pdf", "application/vnd.comicbook-rar", "application/vnd.comicbook+zip", "application/epub+zip", "application/vnd.amazon.ebook"],
  cover: ["image/jpeg", "image/png", "image/webp"],
} as const;

type UploadPurpose = keyof typeof ALLOWED_FILES;

function actionFrom(req: VercelRequest): string | undefined {
  const action = req.query.action;
  return Array.isArray(action) ? action[0] : action;
}

function isAllowedKey(value: unknown): value is string {
  return typeof value === "string" && /^(?:comics\/[a-f0-9-]+\.(?:pdf|cbr|cbz|epub|azw3)|covers\/[a-f0-9-]+\.(?:jpeg|jpg|png|webp))$/i.test(value);
}

function extensionFor(contentType: string): string {
  return ({
    "application/pdf": "pdf",
    "application/vnd.comicbook-rar": "cbr",
    "application/vnd.comicbook+zip": "cbz",
    "application/epub+zip": "epub",
    "application/vnd.amazon.ebook": "azw3",
  } as Record<string, string>)[contentType] || contentType.split("/")[1];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  if (!(await requireOwner(req, res))) return;

  const config = getR2Config();
  if (!config) return res.status(503).json({ error: "Serviço de armazenamento indisponível." });

  if (actionFrom(req) === "read") {
    const { key } = req.body ?? {};
    if (!isAllowedKey(key)) return res.status(400).json({ error: "Chave de arquivo inválida." });

    const readUrl = await getSignedUrl(
      createR2Client(config),
      new GetObjectCommand({ Bucket: config.bucketName, Key: key }),
      { expiresIn: 3600 }
    );
    return res.status(200).json({ key, readUrl, expiresInSeconds: 3600 });
  }

  if (actionFrom(req) === "upload") {
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

    const key = `${purpose === "comic" ? "comics" : "covers"}/${crypto.randomUUID()}.${extensionFor(contentType)}`;
    const command = new PutObjectCommand({
      Bucket: config.bucketName,
      Key: key,
      ContentType: contentType,
      Metadata: { original_filename: fileName.replace(/[^a-zA-Z0-9._ -]/g, "_") },
    });
    const uploadUrl = await getSignedUrl(createR2Client(config), command, { expiresIn: 3600 });
    return res.status(200).json({ key, uploadUrl, expiresInSeconds: 3600, maxBytes: 5 * 1024 * 1024 * 1024 });
  }

  return res.status(404).json({ error: "Operação de armazenamento inválida." });
}
