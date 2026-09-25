import { saveSupabaseProgress } from "./supabaseLibrarySync";
type Entry = { page: number; total: number; updatedAt: string };
const storageKey = (userId: string) => `biblioteca-hq-offline-progress:${userId}`;
function load(userId: string): Record<string, Entry> { try { return JSON.parse(localStorage.getItem(storageKey(userId)) || "{}"); } catch { return {}; } }
export function getQueuedProgress(userId: string, comicId: string): Entry | undefined { return load(userId)[comicId]; }
export function applyQueuedProgress(userId: string, comics: import("../types/comic").Comic[]) {
  const pending = load(userId);
  return comics.map((comic) => {
    const entry = pending[comic.id];
    if (!entry || (comic.progress?.updatedAt && Date.parse(comic.progress.updatedAt) > Date.parse(entry.updatedAt))) return comic;
    return { ...comic, progress: { comicId: comic.id, currentPage: entry.page, totalPages: entry.total, percentage: Math.round(entry.page / Math.max(1, entry.total) * 100), status: entry.page >= entry.total ? "completed" as const : "reading" as const, lastReadAt: entry.updatedAt, updatedAt: entry.updatedAt } };
  });
}
const syncing = new Map<string, Promise<void>>();
async function syncEntry(userId: string, comicId: string) {
  if (!navigator.onLine) return;
  const key = `${userId}:${comicId}`;
  if (syncing.has(key)) return syncing.get(key);
  const task = (async () => {
    while (navigator.onLine) {
      const entry = load(userId)[comicId];
      if (!entry || !(await saveSupabaseProgress(comicId, entry.page, entry.total))) break;
      const entries = load(userId);
      if (entries[comicId]?.updatedAt === entry.updatedAt && entries[comicId]?.page === entry.page && entries[comicId]?.total === entry.total) { delete entries[comicId]; localStorage.setItem(storageKey(userId), JSON.stringify(entries)); break; }
    }
  })();
  syncing.set(key, task);
  try { await task; } finally { syncing.delete(key); }
}
export async function saveReadingProgress(userId: string, comicId: string, page: number, total: number) {
  if (!userId || !comicId || !Number.isFinite(page) || !Number.isFinite(total) || total < 1) return;
  const entries = load(userId);
  entries[comicId] = { page: Math.max(1, Math.min(page, total)), total, updatedAt: new Date().toISOString() };
  localStorage.setItem(storageKey(userId), JSON.stringify(entries));
  await syncEntry(userId, comicId);
}
export async function flushReadingProgress(userId: string) {
  if (!navigator.onLine || !userId) return;
  await Promise.all(Object.keys(load(userId)).map((id) => syncEntry(userId, id)));
}
