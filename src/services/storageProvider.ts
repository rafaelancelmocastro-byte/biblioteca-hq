import { StorageProvider, StorageUploadResult } from "../types/repositories";
import { APP_CONFIG } from "../config/app";
import { ensureActiveSession, isSupabaseConfigured, supabase } from "./supabaseClient";
import { publicationFormat, publicationMime } from "./publicationFormats";

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

async function getAccessToken(forceRefresh = false): Promise<string> {
  if (!supabase) throw new Error("Supabase não está configurado.");
  const session = await ensureActiveSession(forceRefresh);
  if (!session?.access_token) throw new Error("Sua sessão expirou. Entre novamente.");
  return session.access_token;
}

async function readApiError(response: Response): Promise<string> {
  const payload = await response.json().catch(() => null);
  return payload?.error || "Não foi possível concluir a operação.";
}

async function authenticatedPost(path: string, body: unknown): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const accessToken = await getAccessToken(attempt > 0);
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(body),
      });
      const retryable = response.status === 401 || response.status === 403 || response.status === 429 || response.status >= 500;
      if (retryable && attempt < 2) {
        await wait(350 * (attempt + 1));
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < 2) {
        await wait(350 * (attempt + 1));
        continue;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Falha de comunicação com o servidor.");
}

type UploadFailure = Error & { status?: number; network?: boolean };

async function putSignedFile(
  uploadUrl: string,
  file: File,
  contentType: string,
  timeout: number,
  onProgress?: (percent: number) => void,
): Promise<void> {
  let lastError: UploadFailure | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await new Promise<void>((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open("PUT", uploadUrl);
        request.timeout = timeout;
        request.setRequestHeader("Content-Type", contentType);
        request.upload.onprogress = (event) => {
          if (event.lengthComputable) onProgress?.(Math.round(event.loaded / event.total * 100));
        };
        request.onload = () => {
          if (request.status >= 200 && request.status < 300) resolve();
          else {
            const error = new Error(`O armazenamento recusou o envio (erro ${request.status}).`) as UploadFailure;
            error.status = request.status;
            reject(error);
          }
        };
        request.onerror = () => {
          const error = new Error("Falha de comunicação com o armazenamento.") as UploadFailure;
          error.network = true;
          reject(error);
        };
        request.ontimeout = () => reject(new Error("O envio demorou demais.") as UploadFailure);
        request.send(file);
      });
      return;
    } catch (error) {
      lastError = error as UploadFailure;
      const retryable = lastError.network || lastError.status === 408 || lastError.status === 429 || (lastError.status ?? 0) >= 500;
      if (!retryable || attempt === 1) break;
      await wait(650);
    }
  }

  if (lastError?.network) {
    throw new Error("Falha ao enviar para o armazenamento. A conexão com o R2 foi interrompida; tente novamente em alguns segundos.");
  }
  if (lastError?.message === "O envio demorou demais.") {
    throw new Error("O envio demorou demais. Tente novamente; arquivos já preparados permanecem na fila.");
  }
  throw lastError || new Error("Não foi possível enviar o arquivo.");
}

export class R2StorageProvider implements StorageProvider {
  async getFileUrl(fileKey: string): Promise<string> {
    const response = await authenticatedPost("/api/storage/presign-read", { key: fileKey });
    if (!response.ok) throw new Error(await readApiError(response));
    const payload = await response.json();
    return payload.readUrl;
  }

  async createPresignedUploadUrl(fileName: string, contentType: string) {
    const purpose = ["application/pdf", "application/vnd.comicbook-rar", "application/vnd.comicbook+zip", "application/epub+zip", "application/vnd.amazon.ebook"].includes(contentType) ? "comic" : "cover";
    const response = await authenticatedPost("/api/storage/presign-upload", { fileName, contentType, purpose });
    if (!response.ok) throw new Error(await readApiError(response));
    const payload = await response.json();
    return { uploadUrl: payload.uploadUrl, fileKey: payload.key };
  }

  async uploadFile(file: File, path: string, onProgress?: (percent: number) => void): Promise<StorageUploadResult> {
    // Mobile document pickers often report PDFs as octet-stream or x-pdf.
    // The signed-upload endpoint requires the canonical MIME type.
    const contentType = path === "comics" ? publicationMime(file.name) : /\.png$/i.test(file.name) ? "image/png" : /\.jpe?g$/i.test(file.name) ? "image/jpeg" : /\.webp$/i.test(file.name) ? "image/webp" : file.type;
    if (path === "comics" && !publicationFormat(file.name)) throw new Error("Use PDF, CBR, CBZ, EPUB ou AZW3.");
    if (path !== "comics" && !["image/png", "image/jpeg", "image/webp"].includes(contentType)) throw new Error("Use uma capa JPG, PNG ou WebP.");

    const { uploadUrl, fileKey } = await this.createPresignedUploadUrl(file.name, contentType);
    await putSignedFile(uploadUrl, file, contentType, path === "comics" ? 30 * 60 * 1000 : 180000, onProgress);
    onProgress?.(100);

    return {
      fileKey,
      fileSizeMb: Number((file.size / (1024 * 1024)).toFixed(2)),
      signedUrl: path,
    };
  }

  async checkHealth() {
    const response = await fetch("/api/integrations/health");
    const payload = await response.json().catch(() => null);
    const configured = response.ok && payload?.integrations?.r2 === "ok";
    return {
      provider: "cloudflare_r2" as const,
      configured,
      bucketName: APP_CONFIG.infra.storageBucketName,
      message: configured ? "Cloudflare R2 conectado." : "Cloudflare R2 indisponível.",
    };
  }
}

/**
 * Provedor de Armazenamento Local / Simulado.
 * Projetado para ser substituído diretamente pelo Cloudflare R2 SDK / Presigned S3 client
 * sem alterar nenhum componente de interface de usuário.
 */
export class LocalStorageProvider implements StorageProvider {
  private bucketName: string;

  constructor(bucketName = APP_CONFIG.infra.storageBucketName) {
    this.bucketName = bucketName;
  }

  async getFileUrl(fileKey: string): Promise<string> {
    return `/storage/comics/${this.bucketName}/${fileKey}`;
  }

  async createPresignedUploadUrl(fileName: string, contentType: string): Promise<{
    uploadUrl: string;
    fileKey: string;
  }> {
    const timestamp = Date.now();
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileKey = `uploads/${timestamp}-${sanitizedName}`;
    return {
      uploadUrl: `https://${this.bucketName}.r2.cloudflarestorage.com/${fileKey}?mock_token=presigned_${timestamp}`,
      fileKey,
    };
  }

  async uploadFile(file: File, path: string, onProgress?: (percent: number) => void): Promise<StorageUploadResult> {
    await new Promise((resolve) => setTimeout(resolve, 800));
    onProgress?.(100);
    const fileSizeMb = Number((file.size / (1024 * 1024)).toFixed(2));
    const fileKey = `${path}/${file.name}`;
    return { fileKey, fileSizeMb, signedUrl: await this.getFileUrl(fileKey) };
  }

  async checkHealth(): Promise<{
    provider: "local_storage" | "cloudflare_r2";
    configured: boolean;
    bucketName: string;
    message: string;
  }> {
    const hasEnvKeys = false;
    return {
      provider: "local_storage",
      configured: hasEnvKeys,
      bucketName: this.bucketName,
      message: "Provedor local ativo. Conexão real com Cloudflare R2 aguarda credenciais na próxima etapa.",
    };
  }
}

export const storageProvider: StorageProvider = isSupabaseConfigured
  ? new R2StorageProvider()
  : new LocalStorageProvider();
