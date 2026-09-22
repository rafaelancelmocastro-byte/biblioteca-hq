import { StorageProvider, StorageUploadResult } from "../types/repositories";
import { APP_CONFIG } from "../config/app";
import { isSupabaseConfigured, supabase } from "./supabaseClient";

async function getAccessToken(): Promise<string> {
  if (!supabase) throw new Error("Supabase não está configurado.");
  const { data } = await supabase.auth.getSession();
  if (!data.session?.access_token) throw new Error("Sua sessão expirou. Entre novamente.");
  return data.session.access_token;
}

async function readApiError(response: Response): Promise<string> {
  const payload = await response.json().catch(() => null);
  return payload?.error || "Não foi possível concluir a operação.";
}

export class R2StorageProvider implements StorageProvider {
  async getFileUrl(fileKey: string): Promise<string> {
    const accessToken = await getAccessToken();
    const response = await fetch("/api/storage/presign-read", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ key: fileKey }),
    });
    if (!response.ok) throw new Error(await readApiError(response));
    const payload = await response.json();
    return payload.readUrl;
  }

  async createPresignedUploadUrl(fileName: string, contentType: string) {
    const accessToken = await getAccessToken();
    const purpose = contentType === "application/pdf" ? "comic" : "cover";
    const response = await fetch("/api/storage/presign-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ fileName, contentType, purpose }),
    });
    if (!response.ok) throw new Error(await readApiError(response));
    const payload = await response.json();
    return { uploadUrl: payload.uploadUrl, fileKey: payload.key };
  }

  async uploadFile(file: File, path: string): Promise<StorageUploadResult> {
    const { uploadUrl, fileKey } = await this.createPresignedUploadUrl(file.name, file.type);
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!response.ok) throw new Error("O R2 recusou o upload do arquivo.");

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
    // Nesta etapa sem conexão R2 real, simula uma URL local ou blob
    return `/storage/comics/${this.bucketName}/${fileKey}`;
  }

  async createPresignedUploadUrl(fileName: string, contentType: string): Promise<{
    uploadUrl: string;
    fileKey: string;
  }> {
    const timestamp = Date.now();
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileKey = `uploads/${timestamp}-${sanitizedName}`;

    // Em produção com Cloudflare R2, aqui o backend chamaria o S3 client com putObject presigned URL
    return {
      uploadUrl: `https://${this.bucketName}.r2.cloudflarestorage.com/${fileKey}?mock_token=presigned_${timestamp}`,
      fileKey,
    };
  }

  async uploadFile(file: File, path: string): Promise<StorageUploadResult> {
    // Simulação assíncrona com delay realista de rede
    await new Promise((resolve) => setTimeout(resolve, 800));

    const fileSizeMb = Number((file.size / (1024 * 1024)).toFixed(2));
    const fileKey = `${path}/${file.name}`;

    return {
      fileKey,
      fileSizeMb,
      signedUrl: await this.getFileUrl(fileKey),
    };
  }

  async checkHealth(): Promise<{
    provider: "local_storage" | "cloudflare_r2";
    configured: boolean;
    bucketName: string;
    message: string;
  }> {
    const hasEnvKeys = false; // Nesta primeira etapa, mock local

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
