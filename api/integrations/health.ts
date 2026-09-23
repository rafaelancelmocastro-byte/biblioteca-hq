import { HeadBucketCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createR2Client, getR2Config } from "../_lib/r2.js";

type IntegrationStatus = "ok" | "unavailable";

async function checkSupabase(): Promise<IntegrationStatus> {
  const url = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return "unavailable";

  try {
    const client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await client.auth.admin.listUsers({ page: 1, perPage: 1 });
    return error ? "unavailable" : "ok";
  } catch {
    return "unavailable";
  }
}

async function checkR2(): Promise<IntegrationStatus> {
  const config = getR2Config();
  if (!config) return "unavailable";

  try {
    await createR2Client(config).send(new HeadBucketCommand({ Bucket: config.bucketName }));
    return "ok";
  } catch {
    return "unavailable";
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const [supabase, r2] = await Promise.all([checkSupabase(), checkR2()]);
  const status = supabase === "ok" && r2 === "ok" ? "ok" : "degraded";

  return res.status(status === "ok" ? 200 : 503).json({
    status,
    integrations: { supabase, r2 },
  });
}
