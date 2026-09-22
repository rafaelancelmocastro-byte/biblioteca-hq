import { supabase } from "./supabaseClient";

export async function getAssetUrls(keys: string[]): Promise<Record<string, string>> {
  if (!supabase || !keys.length) return {};
  const { data } = await supabase.auth.getSession();
  if (!data.session) return {};
  const response = await fetch("/api/storage/cover-urls", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ assetKeys: [...new Set(keys)] }) });
  if (!response.ok) return {};
  return (await response.json()).urls || {};
}
