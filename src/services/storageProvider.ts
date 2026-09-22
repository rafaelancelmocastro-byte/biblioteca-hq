import { StorageProvider, StorageUploadResult } from "../types/repositories";
import { APP_CONFIG } from "../config/app";

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

export const storageProvider = new LocalStorageProvider();
