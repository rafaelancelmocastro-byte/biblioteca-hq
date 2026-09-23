import { unrar, type RarEntry } from "unrarit";
import { publicationFormat } from "./publicationFormats";

export type PublicationBook = {
  sections: Array<{ id?: string; size?: number }>;
  metadata?: { title?: string | Record<string, string>; author?: unknown };
  dir?: string;
  getCover?: () => Promise<Blob> | Blob;
  getPageBlob?: (index: number) => Promise<Blob>;
  destroy?: () => void;
};

const imagePattern = /\.(jpe?g|png|gif|webp|bmp|avif)$/i;

export async function openPublicationBook(file: File): Promise<PublicationBook> {
  if (publicationFormat(file.name) !== "cbr") {
    const { makeBook } = await import("foliate-js/view.js");
    return makeBook(file) as Promise<PublicationBook>;
  }

  const { rar, entries: archiveEntries } = await unrar(file);
  const entries = Object.values(archiveEntries)
    .filter((entry) => !entry.isDirectory && imagePattern.test(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  if (!entries.length) { rar.dispose(); throw new Error("O CBR não contém páginas de imagem legíveis."); }
  if (entries.some((entry) => entry.encrypted)) { rar.dispose(); throw new Error("CBR protegido por senha não pode ser lido."); }

  const names = new Map(entries.map((entry, index) => [`page-${String(index).padStart(6, "0")}.jpg`, entry]));
  const mime = (entry: RarEntry) => {
    const extension = entry.name.split(".").pop()?.toLowerCase();
    return extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : extension === "gif" ? "image/gif" : extension === "bmp" ? "image/bmp" : extension === "avif" ? "image/avif" : "image/jpeg";
  };
  const loader = {
    entries: [...names.keys()].map((filename) => ({ filename })),
    getSize: (name: string) => names.get(name)?.size || 0,
    getComment: () => rar.comment || "",
    loadBlob: (name: string) => {
      const entry = names.get(name);
      if (!entry) throw new Error("Página não encontrada no CBR.");
      return entry.blob(mime(entry));
    },
  };
  try {
    const { makeComicBook } = await import("foliate-js/comic-book.js");
    const book = await makeComicBook(loader, file) as PublicationBook;
    book.getPageBlob = (index: number) => {
      const entry = entries[index];
      if (!entry) throw new Error("Página não encontrada no CBR.");
      return entry.blob(mime(entry));
    };
    const destroy = book.destroy?.bind(book);
    book.destroy = () => { destroy?.(); rar.dispose(); };
    return book;
  } catch (error) { rar.dispose(); throw error; }
}
