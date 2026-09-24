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

export async function openPublicationBook(file: File, cbrSource?: { getLength: () => Promise<number>; read: (offset: number, length: number) => Promise<Uint8Array> }): Promise<PublicationBook> {
  const format = publicationFormat(file.name);
  if (format !== "cbr" && format !== "cbz") {
    const { makeBook } = await import("foliate-js/view.js");
    return makeBook(file) as Promise<PublicationBook>;
  }

  if (format === "cbz") {
    const { BlobReader, BlobWriter, ZipReader, configure } = await import("@zip.js/zip.js");
    configure({ useWebWorkers: false });
    const archive = new ZipReader(new BlobReader(file));
    try {
      const entries = (await archive.getEntries())
        .filter((entry) => !entry.directory && imagePattern.test(entry.filename))
        .sort((a, b) => a.filename.localeCompare(b.filename, undefined, { numeric: true }));
      if (!entries.length) throw new Error("O CBZ não contém páginas de imagem legíveis.");
      if (entries.some((entry) => entry.encrypted)) throw new Error("CBZ protegido por senha não pode ser lido.");
      const names = new Map(entries.map((entry, index) => [`page-${String(index).padStart(6, "0")}.jpg`, entry]));
      const pageBlob = (index: number) => {
        const entry = entries[index];
        if (!entry) throw new Error("Página não encontrada no CBZ.");
        const extension = entry.filename.split(".").pop()?.toLowerCase();
        const type = extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : extension === "gif" ? "image/gif" : extension === "bmp" ? "image/bmp" : extension === "avif" ? "image/avif" : "image/jpeg";
        if (!entry.getData) throw new Error("Página inválida no CBZ.");
        return entry.getData(new BlobWriter(type));
      };
      const loader = {
        entries: [...names.keys()].map((filename) => ({ filename })),
        getSize: (name: string) => names.get(name)?.uncompressedSize || 0,
        getComment: () => "",
        loadBlob: (name: string) => pageBlob([...names.keys()].indexOf(name)),
      };
      const { makeComicBook } = await import("foliate-js/comic-book.js");
      const book = await makeComicBook(loader, file) as PublicationBook;
      book.getPageBlob = pageBlob;
      const destroy = book.destroy?.bind(book);
      book.destroy = () => { destroy?.(); void archive.close(); };
      return book;
    } catch (error) { await archive.close(); throw error; }
  }

  const { rar, entries: archiveEntries } = await unrar(cbrSource || file);
  const entries = Object.values(archiveEntries)
    .filter((entry) => !entry.isDirectory && imagePattern.test(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  if (!entries.length) { rar.dispose(); throw new Error("O CBR não contém páginas de imagem legíveis."); }
  if (entries.some((entry) => entry.encrypted)) { rar.dispose(); throw new Error("CBR protegido por senha não pode ser lido."); }

  const names = new Map(entries.map((entry, index) => [`page-${String(index).padStart(6, "0")}.jpg`, entry]));
  // unrarit shares a WASM heap between entries. Concurrent extraction can detach
  // its ArrayBuffer while another page is still copying image bytes.
  let extraction = Promise.resolve();
  const mime = (entry: RarEntry) => {
    const extension = entry.name.split(".").pop()?.toLowerCase();
    return extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : extension === "gif" ? "image/gif" : extension === "bmp" ? "image/bmp" : extension === "avif" ? "image/avif" : "image/jpeg";
  };
  const extract = (entry: RarEntry): Promise<Blob> => {
    const result = extraction.then(() => entry.blob(mime(entry)));
    extraction = result.then(() => undefined, () => undefined);
    return result;
  };
  const loader = {
    entries: [...names.keys()].map((filename) => ({ filename })),
    getSize: (name: string) => names.get(name)?.size || 0,
    getComment: () => rar.comment || "",
    loadBlob: (name: string) => {
      const entry = names.get(name);
      if (!entry) throw new Error("Página não encontrada no CBR.");
      return extract(entry);
    },
  };
  try {
    const { makeComicBook } = await import("foliate-js/comic-book.js");
    const book = await makeComicBook(loader, file) as PublicationBook;
    book.getPageBlob = (index: number) => {
      const entry = entries[index];
      if (!entry) throw new Error("Página não encontrada no CBR.");
      return extract(entry);
    };
    const destroy = book.destroy?.bind(book);
    book.destroy = () => { destroy?.(); rar.dispose(); };
    return book;
  } catch (error) { rar.dispose(); throw error; }
}
