import { ensureActiveSession, supabase } from "./supabaseClient";

const urlCache = new Map<string, { url: string; expiresAt: number }>();

export function invalidateAssetUrlsCache() {
  urlCache.clear();
}

// Invalida cache de URLs assinadas quando a autenticação mudar
if (supabase) {
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT" || event === "USER_UPDATED") {
      invalidateAssetUrlsCache();
    }
  });
}

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

  let session = await ensureActiveSession();
  if (!session?.access_token) return getCachedAssetUrls(unique);

  const fetchChunk = async (assetKeys: string[], token: string): Promise<Response> => {
    return fetch("/api/storage/cover-urls", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ assetKeys }),
    });
  };

  await Promise.all(
    Array.from({ length: Math.ceil(missing.length / 100) }, (_, index) => missing.slice(index * 100, (index + 1) * 100)).map(async (assetKeys) => {
      try {
        let response = await fetchChunk(assetKeys, session!.access_token);

        // Se retornar 401 ou 403, renova a sessão ativamente e tenta mais uma vez
        if ((response.status === 401 || response.status === 403) && session) {
          console.warn("[AssetUrls] 401/403 detectado ao buscar capas/assets. Renovando sessão e tentando novamente...");
          const refreshed = await ensureActiveSession(true);
          if (refreshed?.access_token) {
            session = refreshed;
            response = await fetchChunk(assetKeys, refreshed.access_token);
          }
        }

        if (!response.ok) {
          console.warn(`[AssetUrls] Falha na requisição cover-urls para assets (status ${response.status})`);
          return;
        }

        const payload = await response.json();
        const urls = payload.urls || {};
        for (const [key, url] of Object.entries(urls)) {
          if (typeof url === "string") {
            urlCache.set(key, { url, expiresAt: Date.now() + 13 * 60_000 });
          }
        }
      } catch (err) {
        console.warn("[AssetUrls] Erro de rede ou parse ao carregar capas de assets:", err);
      }
    })
  );

  return getCachedAssetUrls(unique);
}
