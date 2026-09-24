import { supabase } from "./supabaseClient";

const urlCache = new Map<string, { url: string; expiresAt: number }>();

export function getCachedAssetUrls(keys: string[]): Record<string, string> {
  const now = Date.now();
  return Object.fromEntries(keys.flatMap((key) => {
    const cached = urlCache.get(key);
    return cached && cached.expiresAt > now ? [[key, cached.url]] : [];
  }));
}

export async function getAssetUrls(keys: string[]): Promise<Record<string, string>> {
  if (!supabase || !keys.length) return {};
  const unique = [...new Set(keys)];
  const missing = unique.filter((key) => !getCachedAssetUrls([key])[key]);
  if (!missing.length) return getCachedAssetUrls(unique);
  const { data } = await supabase.auth.getSession();
  if (!data.session) return getCachedAssetUrls(unique);
  await Promise.all(Array.from({ length: Math.ceil(missing.length / 100) }, (_, index) => missing.slice(index * 100, (index + 1) * 100)).map(async (assetKeys) => {
    const response = await fetch("/api/storage/cover-urls", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session!.access_token}` }, body: JSON.stringify({ assetKeys }) });
    if (!response.ok) return;
    const urls = (await response.json()).urls || {};
    for (const [key, url] of Object.entries(urls)) if (typeof url === "string") urlCache.set(key, { url, expiresAt: Date.now() + 13 * 60_000 });
  }));
  return getCachedAssetUrls(unique);
}
