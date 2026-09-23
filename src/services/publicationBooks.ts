import { createExtractorFromData } from "node-unrar-js";
import unrarWasmUrl from "node-unrar-js/esm/js/unrar.wasm?url";
import { publicationFormat } from "./publicationFormats";

export type PublicationBook = {
  sections: Array<{ id?: string; size?: number }>;
  metadata?: { title?: string | Record<string, string>; author?: unknown };
  dir?: string;
  getCover?: () => Promise<Blob> | Blob;
  destroy?: () => void;
};

const imagePattern = /\.(jpe?g|png|gif|webp|bmp|avif)$/i;
let wasmBytes: Promise<ArrayBuffer> | null = null;

async function rarExtractor(file: Blob) {
  wasmBytes ??= fetch(unrarWasmUrl).then((response) => {
    if (!response.ok) throw new Error("Não foi possível carregar o decodificador CBR.");
    return response.arrayBuffer();
  });
  const [wasmBinary, data] = await Promise.all([wasmBytes, file.arrayBuffer()]);
  return createExtractorFromData({ wasmBinary, data });
}

export async function openPublicationBook(file: File): Promise<PublicationBook> {
  if (publicationFormat(file.name) !== "cbr") {
    const { makeBook } = await import("foliate-js/view.js");
    return makeBook(file) as Promise<PublicationBook>;
  }

  const extractor = await rarExtractor(file);
  const entries = [...extractor.getFileList().fileHeaders]
    .filter((header) => !header.flags.directory && imagePattern.test(header.name))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  if (!entries.length) throw new Error("O CBR não contém páginas de imagem legíveis.");
  if (entries.some((header) => header.flags.encrypted)) throw new Error("CBR protegido por senha não pode ser lido.");
  const names = new Map(entries.map((header, index) => [`page-${String(index).padStart(6, "0")}.jpg`, header]));
  const loader = {
    entries: [...names.keys()].map((filename) => ({ filename })),
    getSize: (name: string) => names.get(name)?.unpSize || 0,
    getComment: () => "",
    loadBlob: (name: string) => {
      const original = names.get(name);
      if (!original) throw new Error("Página não encontrada no CBR.");
      const entry = [...extractor.extract({ files: [original.name] }).files].find((item) => item.fileHeader.name === original.name);
      if (!entry?.extraction) throw new Error("Não foi possível extrair uma página do CBR.");
      const extension = original.name.split(".").pop()?.toLowerCase();
      const type = extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : extension === "gif" ? "image/gif" : extension === "bmp" ? "image/bmp" : extension === "avif" ? "image/avif" : "image/jpeg";
      return new Blob([new Uint8Array(entry.extraction)], { type });
    },
  };
  const { makeComicBook } = await import("foliate-js/comic-book.js");
  return makeComicBook(loader, file) as Promise<PublicationBook>;
}
