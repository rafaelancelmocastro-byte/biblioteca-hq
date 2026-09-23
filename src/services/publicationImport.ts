import { inspectPdf, makeImageThumbnail, manualPdfInspection, type PdfInspection } from "./pdfImport";
import { openPublicationBook } from "./publicationBooks";
import { publicationFormat } from "./publicationFormats";

const clean = (name: string) => name.replace(/\.[^.]+$/, "").replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
const year = (name: string) => name.match(/\b(18\d{2}|19\d{2}|20\d{2})\b/)?.[1] || "";
const issue = (name: string) => name.match(/(?:#|(?:edi[çc][ãa]o|issue|n[ºo.]?)\s*)(\d{1,4})\b/i)?.[1] || "";

export async function inspectPublication(file: File, lightweight = false): Promise<PdfInspection> {
  const format = publicationFormat(file.name);
  if (!format) throw new Error("Use um arquivo PDF, CBR, EPUB ou AZW3.");
  if (format === "pdf") return lightweight ? manualPdfInspection(file) : inspectPdf(file);

  const header = new Uint8Array(await file.slice(0, 100).arrayBuffer());
  if (format === "azw3") {
    if (new TextDecoder().decode(header.slice(60, 68)) !== "BOOKMOBI") throw new Error("AZW3 inválido ou incompatível.");
    const recordOffset = new DataView(header.buffer).getUint32(78);
    const recordHeader = new DataView(await file.slice(recordOffset, recordOffset + 16).arrayBuffer());
    if (recordHeader.getUint16(12) !== 0) throw new Error("AZW3 com DRM não pode ser aberto no navegador. Use um arquivo sem proteção.");
  } else if (format === "epub" && !(header[0] === 0x50 && header[1] === 0x4b)) {
    throw new Error("EPUB inválido ou corrompido.");
  } else if (format === "cbr" && !(header[0] === 0x52 && header[1] === 0x61 && header[2] === 0x72 && header[3] === 0x21)) {
    throw new Error("CBR inválido ou corrompido.");
  }

  const book = await openPublicationBook(file);
  try {
    if (!book.sections.length) throw new Error("Este arquivo não contém conteúdo legível.");
    const rawTitle = book.metadata?.title;
    const title = typeof rawTitle === "string" && rawTitle.trim() ? rawTitle.trim() : clean(file.name);
    const author = book.metadata?.author;
    const writers = typeof author === "string" ? author : Array.isArray(author) ? author.map((item) => typeof item === "string" ? item : item?.name || "").filter(Boolean).join(", ") : "";
    let cover: File | undefined;
    let thumbnail: File | undefined;
    try {
      const blob = await book.getCover?.();
      if (blob) {
        const extension = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
        cover = new File([blob], `${clean(file.name)}-capa.${extension}`, { type: blob.type || "image/jpeg" });
        thumbnail = await makeImageThumbnail(cover);
      }
    } catch { /* Capa opcional: o proprietário pode selecionar uma imagem. */ }
    return {
      title, issueNumber: issue(file.name) || (["epub", "azw3"].includes(format) ? "1" : ""), year: year(file.name),
      totalPages: String(book.sections.length), writers, pencillers: "", colorists: "",
      synopsis: "", tags: "", characters: "", cover, thumbnail,
      warning: format === "cbr" ? "Páginas encontradas no CBR. Revise título, ano e capa." : "Livro analisado. O progresso será contado por seções/capítulos, pois o número de páginas varia com o tamanho da tela.",
    };
  } finally { book.destroy?.(); }
}

export async function manualPublicationInspection(file: File): Promise<PdfInspection> {
  return publicationFormat(file.name) === "pdf" ? manualPdfInspection(file) : inspectPublication(file, true);
}
