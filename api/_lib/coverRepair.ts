import { createClient } from "@supabase/supabase-js";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { createCanvas } from "@napi-rs/canvas";
import { randomUUID } from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createR2Client, getR2Config } from "./r2.js";

export async function repairComicCover(req: VercelRequest, res: VercelResponse) {
    const id = req.body?.id;
    if (typeof id !== "string" || !/^[a-f0-9-]{36}$/i.test(id)) return res.status(400).json({ error: "Edição inválida." });
    const config = getR2Config();
    if (!config) return res.status(503).json({ error: "Armazenamento indisponível." });
    const admin = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
    const record = await admin.from("comics").select("id,pdf_key,cover_key,deleted_at").eq("id", id).maybeSingle();
    if (record.error || !record.data || record.data.deleted_at || !/^comics\/[a-f0-9-]+\.pdf$/i.test(record.data.pdf_key || "")) return res.status(404).json({ error: "PDF indisponível para recuperar a capa." });
    if (record.data.cover_key) return res.status(200).json({ id, skipped: true });
    const r2 = createR2Client(config);
    try {
      const object = await r2.send(new GetObjectCommand({ Bucket: config.bucketName, Key: record.data.pdf_key }));
      const bytes = await object.Body?.transformToByteArray();
      if (!bytes?.length) throw new Error("PDF vazio.");
      const promiseCompat = Promise as PromiseConstructor & { withResolvers?: <T>() => { promise: Promise<T>; resolve: (value: T | PromiseLike<T>) => void; reject: (reason?: unknown) => void } };
      if (!promiseCompat.withResolvers) {
        promiseCompat.withResolvers = function <T>() {
          let resolve!: (value: T | PromiseLike<T>) => void;
          let reject!: (reason?: unknown) => void;
          const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
          return { promise, resolve, reject };
        };
      }
      const bufferCompat = ArrayBuffer.prototype as ArrayBuffer & { transferToFixedLength?: (length?: number) => ArrayBuffer };
      if (!bufferCompat.transferToFixedLength) {
        bufferCompat.transferToFixedLength = function (this: ArrayBuffer, length = this.byteLength) {
          const copy = new ArrayBuffer(length);
          new Uint8Array(copy).set(new Uint8Array(this, 0, Math.min(length, this.byteLength)));
          return copy;
        };
      }
      // Vercel traces only explicit imports; the PDF.js fake worker's computed
      // import is otherwise omitted from the function bundle.
      await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
      const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const task = getDocument({ data: bytes, useSystemFonts: true });
      let full: Buffer, thumb: Buffer;
      try {
        const pdf = await task.promise;
        const page = await pdf.getPage(1);
        const render = async (width: number) => {
          const viewport = page.getViewport({ scale: width / page.getViewport({ scale: 1 }).width });
          const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
          await page.render({ canvas: canvas as unknown as HTMLCanvasElement, canvasContext: canvas.getContext("2d") as unknown as CanvasRenderingContext2D, viewport }).promise;
          return canvas.toBuffer("image/jpeg");
        };
        full = await render(1200);
        thumb = await render(420);
      } finally { await task.destroy().catch(() => {}); }
      const coverKey = `covers/${randomUUID()}.jpg`, coverThumbKey = `covers/${randomUUID()}.jpg`;
      await Promise.all([[coverKey, full], [coverThumbKey, thumb]].map(([key, body]) => r2.send(new PutObjectCommand({ Bucket: config.bucketName, Key: key as string, Body: body as Buffer, ContentType: "image/jpeg" }))));
      const updated = await admin.from("comics").update({ cover_key: coverKey, cover_thumb_key: coverThumbKey }).eq("id", id).is("deleted_at", null).is("cover_key", null).select("id").maybeSingle();
      if (updated.error || !updated.data) return res.status(409).json({ error: "A edição foi alterada durante a recuperação." });
      return res.status(200).json({ id, recovered: true });
    } catch (error) {
      console.error("Falha ao recuperar a primeira página do PDF", { id, error });
      return res.status(500).json({ error: "Não foi possível gerar a capa deste PDF. Confira se a primeira página abre no leitor." });
    }
}
