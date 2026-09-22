import type { Comic } from "../types/comic";
import { getComicReadUrl } from "./comicRead";

type Edition = { id: string; userId: string; comic: Comic; chunks: number; size: number; savedAt: string; cover?: Blob };
type EncryptedChunk = { id: string; iv: Uint8Array; data: ArrayBuffer };
const DB_NAME = "biblioteca-hq-offline-v1";
const CHUNK_SIZE = 2 * 1024 * 1024;
let cachedIds: { userId: string; promise: Promise<Set<string>> } | null = null;
function changed() { cachedIds = null; window.dispatchEvent(new Event("biblioteca-offline-changed")); }
export function getOfflineIds(userId: string): Promise<Set<string>> {
  if (cachedIds?.userId === userId) return cachedIds.promise;
  const promise = listOffline(userId).then((items) => new Set(items.map((item) => item.comic.id)));
  cachedIds = { userId, promise }; return promise;
}

function request<T>(source: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => { source.onsuccess = () => resolve(source.result); source.onerror = () => reject(source.error); });
}
function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); });
}
async function database(): Promise<IDBDatabase> {
  const open = indexedDB.open(DB_NAME, 1);
  open.onupgradeneeded = () => { const db = open.result; db.createObjectStore("keys"); db.createObjectStore("editions", { keyPath: "id" }); db.createObjectStore("chunks", { keyPath: "id" }); };
  return request(open);
}
async function userKey(db: IDBDatabase, userId: string): Promise<CryptoKey> {
  const existing = await request(db.transaction("keys").objectStore("keys").get(userId)) as CryptoKey | undefined;
  if (existing) return existing;
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  const tx = db.transaction("keys", "readwrite"); tx.objectStore("keys").put(key, userId); await txDone(tx);
  return key;
}
const editionId = (userId: string, comicId: string) => `${userId}:${comicId}`;

export async function listOffline(userId: string): Promise<Edition[]> {
  if (!userId) return [];
  const db = await database();
  try { return (await request(db.transaction("editions").objectStore("editions").getAll()) as Edition[]).filter((item) => item.userId === userId).sort((a, b) => b.savedAt.localeCompare(a.savedAt)); }
  finally { db.close(); }
}
export async function hasOffline(userId: string, comicId: string): Promise<boolean> {
  const db = await database();
  try { return Boolean(await request(db.transaction("editions").objectStore("editions").get(editionId(userId, comicId)))); }
  finally { db.close(); }
}
export async function saveOffline(userId: string, comic: Comic, onProgress?: (received: number) => void): Promise<void> {
  if (!userId) throw new Error("Entre na sua conta para salvar uma edição.");
  const url = await getComicReadUrl(comic.id);
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok || !response.body) throw new Error("Não foi possível baixar esta edição para o app.");
  const db = await database(); const key = await userKey(db, userId); const id = editionId(userId, comic.id);
  await removeOffline(userId, comic.id);
  let count = 0, size = 0;
  let pending = new Uint8Array(0);
  const writeChunk = async (bytes: Uint8Array) => {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, bytes as BufferSource);
    const tx = db.transaction("chunks", "readwrite"); tx.objectStore("chunks").put({ id: `${id}:${count++}`, iv, data } satisfies EncryptedChunk); await txDone(tx);
  };
  try {
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength; onProgress?.(size);
      const joined = new Uint8Array(pending.byteLength + value.byteLength); joined.set(pending); joined.set(value, pending.byteLength);
      let offset = 0;
      while (joined.byteLength - offset >= CHUNK_SIZE) { await writeChunk(joined.slice(offset, offset + CHUNK_SIZE)); offset += CHUNK_SIZE; }
      pending = joined.slice(offset);
    }
    if (pending.byteLength) await writeChunk(pending);
    let cover: Blob | undefined;
    if (comic.coverUrl) { try { const image = await fetch(comic.coverUrl); if (image.ok) cover = await image.blob(); } catch { /* optional cover */ } }
    const storedComic = { ...comic, coverUrl: undefined };
    const tx = db.transaction("editions", "readwrite"); tx.objectStore("editions").put({ id, userId, comic: storedComic, chunks: count, size, savedAt: new Date().toISOString(), cover } satisfies Edition); await txDone(tx);
    changed();
  } catch (error) {
    const tx = db.transaction(["editions", "chunks"], "readwrite");
    tx.objectStore("editions").delete(id);
    for (let i = 0; i < count; i++) tx.objectStore("chunks").delete(`${id}:${i}`);
    await txDone(tx);
    changed();
    throw error;
  }
  finally { db.close(); }
}
export async function readOffline(userId: string, comicId: string): Promise<{ comic: Comic; data: Uint8Array } | null> {
  const db = await database();
  try {
    const id = editionId(userId, comicId);
    const edition = await request(db.transaction("editions").objectStore("editions").get(id)) as Edition | undefined;
    if (!edition) return null;
    const key = await userKey(db, userId);
    const data = new Uint8Array(edition.size); let offset = 0;
    for (let i = 0; i < edition.chunks; i++) {
      const chunk = await request(db.transaction("chunks").objectStore("chunks").get(`${id}:${i}`)) as EncryptedChunk | undefined;
      if (!chunk) throw new Error("Arquivo offline incompleto. Salve a edição novamente.");
      const decrypted = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: chunk.iv as BufferSource }, key, chunk.data));
      data.set(decrypted, offset); offset += decrypted.byteLength;
    }
    return { comic: edition.comic, data };
  } finally { db.close(); }
}
export async function removeOffline(userId: string, comicId: string): Promise<void> {
  const db = await database();
  try {
    const id = editionId(userId, comicId);
    const item = await request(db.transaction("editions").objectStore("editions").get(id)) as Edition | undefined;
    const tx = db.transaction(["editions", "chunks"], "readwrite");
    tx.objectStore("editions").delete(id);
    for (let i = 0; i < (item?.chunks || 0); i++) tx.objectStore("chunks").delete(`${id}:${i}`);
    await txDone(tx);
    changed();
  } finally { db.close(); }
}
export async function clearOffline(userId: string): Promise<void> { for (const item of await listOffline(userId)) await removeOffline(userId, item.comic.id); }
