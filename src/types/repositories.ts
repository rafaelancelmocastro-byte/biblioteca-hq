/**
 * Interfaces para a camada de acesso a dados e serviços de armazenamento.
 * Permitem desacoplar a lógica de UI de provedores reais como Supabase e Cloudflare R2.
 */

import { Comic, ComicStatus, ReadingProgress, Series, Character, LibraryFilters, SortOption } from "./comic";

export interface ComicRepository {
  getAll(): Promise<Comic[]>;
  getById(id: string): Promise<Comic | null>;
  getBySeries(seriesId: string): Promise<Comic[]>;
  getRecentlyAdded(limit?: number): Promise<Comic[]>;
  getSeriesList(): Promise<Series[]>;
  getCharactersList(): Promise<Character[]>;
  getPublishers(): Promise<string[]>;
  getYears(): Promise<number[]>;
  searchAndFilter(filters: LibraryFilters): Promise<Comic[]>;
}

export interface ProgressRepository {
  getProgress(comicId: string): Promise<ReadingProgress | null>;
  getAllProgress(): Promise<Record<string, ReadingProgress>>;
  saveProgress(comicId: string, currentPage: number, totalPages: number): Promise<ReadingProgress>;
  updateStatus(comicId: string, status: ComicStatus, totalPages: number): Promise<ReadingProgress>;
  markCompleted(comicId: string, totalPages: number): Promise<ReadingProgress>;
  resetProgress(comicId: string): Promise<void>;
  getContinueReading(limit?: number): Promise<Comic[]>;
}

export interface FavoriteRepository {
  getFavoriteIds(): Promise<string[]>;
  isFavorite(comicId: string): Promise<boolean>;
  toggleFavorite(comicId: string): Promise<boolean>;
  setFavorite(comicId: string, isFav: boolean): Promise<void>;
}

export interface StorageUploadResult {
  fileKey: string;
  fileSizeMb: number;
  signedUrl?: string;
}

export interface StorageProvider {
  /**
   * Obtém URL assinada ou caminho temporário de um arquivo PDF ou capa.
   */
  getFileUrl(fileKey: string): Promise<string>;
  
  /**
   * Prepara upload de um arquivo para o Cloudflare R2 via URL pré-assinada.
   */
  createPresignedUploadUrl(fileName: string, contentType: string): Promise<{
    uploadUrl: string;
    fileKey: string;
  }>;
  
  /**
   * Upload direto ou simulação de envio
   */
  uploadFile(file: File, path: string, onProgress?: (percent: number) => void): Promise<StorageUploadResult>;
  
  /**
   * Verifica se o armazenamento na nuvem está ativo e acessível
   */
  checkHealth(): Promise<{
    provider: "local_storage" | "cloudflare_r2";
    configured: boolean;
    bucketName: string;
    message: string;
  }>;
}
