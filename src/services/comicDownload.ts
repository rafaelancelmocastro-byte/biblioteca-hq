import { supabase } from "./supabaseClient";

const CHUNK_SIZE = 2 * 1024 * 1024;
const REMOTE_BLOCK_SIZE = 256 * 1024;

async function fetchChunk(comicId: string, token: string, start: number, end: number): Promise<Response> {
  return fetch(`/api/storage/comic-read?comicId=${encodeURIComponent(comicId)}&start=${start}&end=${end}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
}

export async function createRemoteArchiveSource(comicId: string, signedUrl: string) {
  if (!supabase) throw new Error("Autenticação indisponível.");
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Entre novamente para ler esta edição.");
  const first = await fetchChunk(comicId, token, 0, 0);
  if (!first.ok) throw new Error("Não foi possível consultar o tamanho da edição.");
  const total = Number(first.headers.get("Content-Range")?.split("/")[1]);
  if (!Number.isSafeInteger(total) || total < 1) throw new Error("Tamanho da edição inválido.");
  const cache = new Map<number, Uint8Array>();
  const readRange = async (start: number, end: number): Promise<Uint8Array> => {
    try {
      const response = await fetch(signedUrl, { headers: { Range: `bytes=${start}-${end}` } });
      if (response.status === 206) {
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.length === end - start + 1) return bytes;
      }
    } catch { /* Fall back to the authenticated route. */ }
    const response = await fetchChunk(comicId, token, start, end);
    if (!response.ok) throw new Error("Não foi possível carregar um trecho da HQ.");
    return new Uint8Array(await response.arrayBuffer());
  };
  return {
    getLength: async () => total,
    read: async (offset: number, length: number): Promise<Uint8Array> => {
      if (length === 0) return new Uint8Array(0);
      if (offset < 0 || length < 0 || offset + length > total) throw new Error("Trecho fora do arquivo.");
      if (length > REMOTE_BLOCK_SIZE) {
        const parts: Uint8Array[] = [];
        for (let start = offset; start < offset + length; start += CHUNK_SIZE) parts.push(await readRange(start, Math.min(offset + length, start + CHUNK_SIZE) - 1));
        const result = new Uint8Array(length);
        let position = 0;
        for (const part of parts) { result.set(part, position); position += part.length; }
        return result;
      }
      const blockStart = Math.floor(offset / REMOTE_BLOCK_SIZE) * REMOTE_BLOCK_SIZE;
      let block = cache.get(blockStart);
      if (!block || offset + length > blockStart + block.length) {
        block = await readRange(blockStart, Math.min(total - 1, Math.max(blockStart + REMOTE_BLOCK_SIZE, offset + length) - 1));
        cache.set(blockStart, block);
        if (cache.size > 8) cache.delete(cache.keys().next().value!);
      }
      return block.slice(offset - blockStart, offset - blockStart + length);
    },
  };
}

export async function downloadComicBlob(comicId: string, signedUrl: string, onProgress?: (received: number, total: number) => void): Promise<Blob> {
  let total = 0;
  try {
    const response = await fetch(signedUrl);
    if (response.ok) {
      total = Number(response.headers.get("Content-Length"));
      if (!Number.isSafeInteger(total) || total <= CHUNK_SIZE * 4) {
        const blob = await response.blob();
        onProgress?.(blob.size, blob.size);
        return blob;
      }
      await response.body?.cancel();
    }
  } catch { /* Some browsers fail a full cross-origin download; use authenticated chunks. */ }

  if (!supabase) throw new Error("Autenticação indisponível.");
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Entre novamente para ler esta edição.");
  const readPart = async (start: number, end: number): Promise<Blob> => {
    try {
      const response = await fetch(signedUrl, { headers: { Range: `bytes=${start}-${end}` } });
      if (response.status === 206) return await response.blob();
    } catch { /* Try the same-origin route below. */ }
    const response = await fetchChunk(comicId, token, start, end);
    if (!response.ok) throw new Error("Não foi possível baixar a edição. Tente novamente.");
    return response.blob();
  };
  const first = await fetchChunk(comicId, token, 0, CHUNK_SIZE - 1);
  if (!first.ok) throw new Error("Não foi possível baixar a edição. Tente novamente.");
  total = Number(first.headers.get("Content-Range")?.split("/")[1]);
  if (!Number.isSafeInteger(total) || total < 1) throw new Error("O tamanho da edição não pôde ser confirmado.");
  const chunks: Blob[] = new Array(Math.ceil(total / CHUNK_SIZE));
  chunks[0] = await first.blob();
  let received = chunks[0].size;
  onProgress?.(received, total);
  const rest = Array.from({ length: chunks.length - 1 }, (_, index) => index + 1);
  for (let offset = 0; offset < rest.length; offset += 3) {
    await Promise.all(rest.slice(offset, offset + 3).map(async (index) => {
      const start = index * CHUNK_SIZE;
      chunks[index] = await readPart(start, Math.min(total - 1, start + CHUNK_SIZE - 1));
      received += chunks[index].size;
      onProgress?.(received, total);
    }));
  }
  return new Blob(chunks);
}
