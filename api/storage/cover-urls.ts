import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireUser } from "../_lib/user.js";
import { createR2Client, getR2Config } from "../_lib/r2.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Method Not Allowed" }); }
  const auth = await requireUser(req, res);
  if (!auth) return;
  const ids = req.body?.comicIds;
  if (!Array.isArray(ids) || ids.length > 100 || ids.some((id) => typeof id !== "string" || !/^[a-f0-9-]{36}$/i.test(id))) {
    return res.status(400).json({ error: "Identificadores inválidos." });
  }
  const config = getR2Config();
  if (!config) return res.status(503).json({ error: "Armazenamento indisponível." });
  const { data, error } = await auth.admin.from("comics").select("id,cover_key,cover_thumb_key,deleted_at").in("id", ids);
  if (error) return res.status(503).json({ error: "Capas indisponíveis." });
  const client = createR2Client(config);
  const entries = await Promise.all((data ?? []).map(async ({ id, cover_key, cover_thumb_key, deleted_at }) => {
    const key = cover_thumb_key || cover_key;
    if (deleted_at || !key || !/^covers\/[a-f0-9-]+\.(jpe?g|png|webp)$/i.test(key)) return [id, null];
    try {
      const url = await getSignedUrl(client, new GetObjectCommand({ Bucket: config.bucketName, Key: key }), { expiresIn: 900 });
      return [id, url];
    } catch { return [id, null]; }
  }));
  res.setHeader("Cache-Control", "private, no-store");
  return res.status(200).json({ urls: Object.fromEntries(entries) });
}
