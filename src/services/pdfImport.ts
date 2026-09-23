import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export type PdfInspection = {
  title: string;
  issueNumber: string;
  year: string;
  totalPages: string;
  writers: string;
  pencillers: string;
  colorists: string;
  synopsis: string;
  tags: string;
  characters: string;
  fileSha256?: string;
  cover?: File;
  thumbnail?: File;
  warning?: string;
};

const characterNames = ["Superman", "Batman", "Vingadores", "X-Men", "Homem-Aranha", "Liga da Justiça"];
const clean = (value: string) => value.replace(/\.[^.]+$/, "").replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
const yearMatch = (value: string) => value.match(/\b(18\d{2}|19\d{2}|20\d{2})\b/)?.[1] || "";
const issueMatch = (value: string) => value.match(/(?:#|(?:edi[çc][ãa]o|issue|n[ºo.]?)\s*)(\d{1,4})\b/i)?.[1] || value.match(/(?:^|[\s_-])(\d{1,4})(?:\.[^.]+)?$/)?.[1] || "";

async function renderCover(page: Awaited<ReturnType<Awaited<ReturnType<typeof getDocument>["promise"]>["getPage"]>>, file: File, width: number) {
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: width / base.width });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Canvas indisponível.");
  await page.render({ canvas, canvasContext: context, viewport }).promise;
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", .82));
  canvas.width = 0;
  canvas.height = 0;
  if (!blob) throw new Error("Não foi possível gerar a capa.");
  return new File([blob], `${clean(file.name)}-${width}.webp`, { type: "image/webp" });
}

export async function extractPdfCover(source: File | string, name: string): Promise<{ cover: File; thumbnail: File }> {
  const blobUrl = source instanceof File ? URL.createObjectURL(source) : undefined;
  const task = getDocument({ url: blobUrl || source as string, disableAutoFetch: true, disableStream: false });
  try {
    const pdf = await task.promise;
    const page = await pdf.getPage(1);
    const namedFile = new File([], name, { type: "application/pdf" });
    const cover = await renderCover(page, namedFile, matchMedia("(pointer: coarse)").matches ? 800 : 1200);
    const thumbnail = await renderCover(page, namedFile, 420);
    page.cleanup();
    return { cover, thumbnail };
  } finally {
    await task.destroy().catch(() => {});
    if (blobUrl) URL.revokeObjectURL(blobUrl);
  }
}

export async function makeImageThumbnail(file: File): Promise<File> {
  let source: ImageBitmap | HTMLImageElement;
  let objectUrl: string | undefined;
  if (typeof createImageBitmap === "function") {
    try { source = await createImageBitmap(file); }
    catch { objectUrl = URL.createObjectURL(file); source = await loadImage(objectUrl); }
  } else {
    objectUrl = URL.createObjectURL(file);
    source = await loadImage(objectUrl);
  }
  try {
    const width = Math.min(420, source.width);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = Math.max(1, Math.round(source.height * width / source.width));
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Canvas indisponível.");
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", .78));
    canvas.width = 0; canvas.height = 0;
    if (!blob) throw new Error("Não foi possível reduzir a capa.");
    return new File([blob], `${clean(file.name)}-mini.webp`, { type: "image/webp" });
  } finally { if (typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap) source.close(); if (objectUrl) URL.revokeObjectURL(objectUrl); }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Não foi possível abrir a capa selecionada.")); };
    image.src = url;
  });
}

export async function inspectPdf(file: File): Promise<PdfInspection> {
  if (file.type && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) throw new Error("Selecione um PDF válido.");
  const blobUrl = URL.createObjectURL(file);
  const task = getDocument({ url: blobUrl, disableAutoFetch: true });
  try {
    const pdf = await task.promise;
    const metadata = await pdf.getMetadata().catch(() => null);
    const info = (metadata?.info || {}) as Record<string, unknown>;
    const titleFromPdf = typeof info.Title === "string" ? clean(info.Title) : "";
    const fileTitle = clean(file.name);
    const title = titleFromPdf && !/^(untitled|microsoft word|documento|scan)$/i.test(titleFromPdf) ? titleFromPdf : fileTitle;
    const subject = typeof info.Subject === "string" ? info.Subject.trim() : "";
    const keywords = typeof info.Keywords === "string" ? info.Keywords.trim() : "";
    const author = typeof info.Author === "string" && !/^(unknown|scanner|admin)$/i.test(info.Author.trim()) ? info.Author.trim() : "";
    const evidence = [file.name, titleFromPdf, subject, keywords].join(" ");
    const characters = characterNames.filter((name) => new RegExp(`(?:^|[^\\p{L}])${name.replace("-", "[- ]")}(?:$|[^\\p{L}])`, "iu").test(evidence));
    let cover: File | undefined;
    let thumbnail: File | undefined;
    let warning = "";
    try {
      const firstPage = await pdf.getPage(1);
      cover = await renderCover(firstPage, file, 1200);
      thumbnail = await renderCover(firstPage, file, 420);
    } catch { warning = "A capa automática não pôde ser gerada. Selecione uma capa manual."; }
    let fileSha256: string | undefined;
    if (file.size <= 64 * 1024 * 1024) {
      const bytes = await file.arrayBuffer();
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      fileSha256 = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    }
    const year = yearMatch([file.name, titleFromPdf].join(" "));
    const issueCandidate = issueMatch(file.name) || issueMatch(title);
    const issueNumber = issueCandidate === year ? "" : issueCandidate;
    return { title, issueNumber, year, totalPages: String(pdf.numPages), writers: author, pencillers: "", colorists: "", synopsis: subject, tags: keywords, characters: characters.join(", "), fileSha256, cover, thumbnail, warning };
  } catch (error) {
    throw new Error(error instanceof Error && error.name === "PasswordException" ? "PDF protegido por senha." : "O PDF está corrompido ou não pôde ser processado.");
  } finally {
    await task.destroy().catch(() => {});
    URL.revokeObjectURL(blobUrl);
  }
}

export async function manualPdfInspection(file: File): Promise<PdfInspection> {
  const header = new TextDecoder().decode(await file.slice(0, 1024).arrayBuffer());
  if ((!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") || !/%PDF-\d/.test(header)) throw new Error("O arquivo selecionado não parece ser um PDF válido.");
  const title = clean(file.name);
  const year = yearMatch(file.name);
  const issueNumber = issueMatch(file.name);
  return {
    title,
    issueNumber: issueNumber === year ? "" : issueNumber,
    year,
    totalPages: "",
    writers: "",
    pencillers: "",
    colorists: "",
    synopsis: "",
    tags: "",
    characters: "",
    warning: "A análise automática não terminou neste dispositivo. Preencha páginas e confira os demais dados antes de publicar.",
  };
}
