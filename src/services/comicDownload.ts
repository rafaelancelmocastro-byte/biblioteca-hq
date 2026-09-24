import { supabase } from "./supabaseClient";

const CHUNK_SIZE = 2 * 1024 * 1024;

async function fetchChunk(comicId: string, token: string, start: number, end: number): Promise<Response> {
  return fetch(`/api/storage/comic-read?comicId=${encodeURIComponent(comicId)}&start=${start}&end=${end}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
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
