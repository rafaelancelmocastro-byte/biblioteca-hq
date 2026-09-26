import { getRememberedOfflineUser } from "./offlineIdentity";
import { listOffline } from "./offlineLibrary";
import { supabase } from "./supabaseClient";

const cacheKey = (userId: string) => `biblioteca-hq-offline-manifest:${userId}`;

function readCached(userId: string): Set<string> {
  if (!userId) return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(cacheKey(userId)) || "[]") as string[]);
  } catch {
    return new Set();
  }
}

function writeCached(userId: string, ids: Set<string>) {
  if (!userId) return;
  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify([...ids]));
  } catch {
    // Cache is optional.
  }
}

async function resolveUserId(explicitUserId?: string): Promise<string> {
  if (explicitUserId) return explicitUserId;
  const sessionUserId = (await supabase?.auth.getSession())?.data.session?.user.id;
  return sessionUserId || getRememberedOfflineUser();
}

export async function getOfflineLibraryIds(userId?: string): Promise<Set<string>> {
  const resolvedUserId = await resolveUserId(userId);
  const cached = readCached(resolvedUserId);
  if (!supabase || !resolvedUserId || !navigator.onLine) return cached;

  try {
    const { data, error } = await supabase
      .from("offline_library")
      .select("comic_id")
      .eq("user_id", resolvedUserId);
    if (error) return cached;
    const ids = new Set((data ?? []).map((item) => item.comic_id));
    writeCached(resolvedUserId, ids);
    return ids;
  } catch {
    return cached;
  }
}

export async function addOfflineLibraryItem(comicId: string, userId?: string): Promise<boolean> {
  const resolvedUserId = await resolveUserId(userId);
  if (!resolvedUserId) return false;

  const cached = readCached(resolvedUserId);
  cached.add(comicId);
  writeCached(resolvedUserId, cached);

  if (!supabase || !navigator.onLine) return true;
  try {
    const { error } = await supabase
      .from("offline_library")
      .upsert({ user_id: resolvedUserId, comic_id: comicId }, { onConflict: "user_id,comic_id" });
    return !error;
  } catch {
    return false;
  }
}

export async function removeOfflineLibraryItem(comicId: string, userId?: string): Promise<boolean> {
  const resolvedUserId = await resolveUserId(userId);
  if (!resolvedUserId) return false;

  const cached = readCached(resolvedUserId);
  cached.delete(comicId);
  writeCached(resolvedUserId, cached);

  if (!supabase || !navigator.onLine) return true;
  try {
    const { error } = await supabase
      .from("offline_library")
      .delete()
      .eq("user_id", resolvedUserId)
      .eq("comic_id", comicId);
    return !error;
  } catch {
    return false;
  }
}


export async function syncLocalOfflineLibrary(userId?: string): Promise<number> {
  const resolvedUserId = await resolveUserId(userId);
  if (!resolvedUserId || !navigator.onLine) return 0;

  const local = await listOffline(resolvedUserId);
  if (!local.length) return 0;

  const remote = await getOfflineLibraryIds(resolvedUserId);
  const missing = local.filter((item) => !remote.has(item.comic.id));
  if (!missing.length) return 0;

  let synced = 0;
  for (const item of missing) {
    if (await addOfflineLibraryItem(item.comic.id, resolvedUserId)) synced += 1;
  }
  return synced;
}
