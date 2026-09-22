import { saveSupabaseProgress } from "./supabaseLibrarySync";
type Entry = { page: number; total: number; updatedAt: string };
const storageKey = (userId: string) => `biblioteca-hq-offline-progress:${userId}`;
function load(userId: string): Record<string, Entry> { try { return JSON.parse(localStorage.getItem(storageKey(userId)) || "{}"); } catch { return {}; } }
export function getQueuedProgress(userId: string, comicId: string): Entry | undefined { return load(userId)[comicId]; }
export async function saveReadingProgress(userId: string, comicId: string, page: number, total: number) {
  if (navigator.onLine && await saveSupabaseProgress(comicId, page, total)) return;
  const entries = load(userId); entries[comicId] = { page, total, updatedAt: new Date().toISOString() }; localStorage.setItem(storageKey(userId), JSON.stringify(entries));
}
export async function flushReadingProgress(userId: string) {
  if (!navigator.onLine || !userId) return;
  const entries = load(userId);
  for (const [id, entry] of Object.entries(entries)) if (await saveSupabaseProgress(id, entry.page, entry.total)) { delete entries[id]; localStorage.setItem(storageKey(userId), JSON.stringify(entries)); }
}
