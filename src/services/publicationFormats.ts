export type PublicationFormat = "pdf" | "cbr" | "cbz" | "epub" | "azw3";

export const PUBLICATION_ACCEPT = ".pdf,.cbr,.cbz,.epub,.azw3,application/pdf,application/epub+zip,application/vnd.comicbook+zip";

const mime: Record<PublicationFormat, string> = {
  pdf: "application/pdf",
  cbr: "application/vnd.comicbook-rar",
  cbz: "application/vnd.comicbook+zip",
  epub: "application/epub+zip",
  azw3: "application/vnd.amazon.ebook",
};

export function publicationFormat(name: string): PublicationFormat | null {
  const extension = name.split(".").pop()?.toLowerCase();
  return extension && extension in mime ? extension as PublicationFormat : null;
}

export function publicationMime(name: string): string {
  const format = publicationFormat(name);
  if (!format) throw new Error("Use um arquivo PDF, CBR, CBZ, EPUB ou AZW3.");
  return mime[format];
}
