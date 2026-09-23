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

  if (req.query.feed === "comics") {
    try {
      const response = await fetch("https://news.google.com/rss/search?q=quadrinhos+OR+HQs+OR+mang%C3%A1&hl=pt-BR&gl=BR&ceid=BR:pt-419", { signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error("Fonte indisponível");
      const xml = await response.text();
      const decode = (value: string) => value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/<[^>]+>/g, "").trim();
      const field = (item: string, name: string) => decode(item.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`))?.[1] || "");
      const stories = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 8).map((match) => ({ title: field(match[1], "title"), link: field(match[1], "link"), source: field(match[1], "source"), publishedAt: field(match[1], "pubDate") })).filter((story) => story.title && /^https:\/\//.test(story.link));
      res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=3600");
      return res.status(200).json({ stories });
    } catch {
      return res.status(503).json({ error: "Notícias indisponíveis no momento." });
    }
  }

  const [supabase, r2] = await Promise.all([checkSupabase(), checkR2()]);
  const status = supabase === "ok" && r2 === "ok" ? "ok" : "degraded";

  return res.status(status === "ok" ? 200 : 503).json({
    status,
    integrations: { supabase, r2 },
  });
}
