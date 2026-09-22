import { ProgressRepository } from "../types/repositories";
import { Comic, ComicStatus, ReadingProgress } from "../types/comic";
import { getLocalStorageItem, setLocalStorageItem } from "../lib/utils";

const PROGRESS_STORAGE_KEY = "biblioteca_hq_progress_v1";

export class LocalProgressRepository implements ProgressRepository {
  private cache: Record<string, ReadingProgress> | null = null;

  private load(): Record<string, ReadingProgress> {
    if (this.cache) return this.cache;

    const initialMap: Record<string, ReadingProgress> = {};

    const stored = getLocalStorageItem<Record<string, ReadingProgress>>(PROGRESS_STORAGE_KEY, initialMap);
    this.cache = stored;
    return stored;
  }

  private persist(data: Record<string, ReadingProgress>): void {
    this.cache = data;
    setLocalStorageItem(PROGRESS_STORAGE_KEY, data);
  }

  async getProgress(comicId: string): Promise<ReadingProgress | null> {
    const all = this.load();
    return all[comicId] || null;
  }

  async getAllProgress(): Promise<Record<string, ReadingProgress>> {
    return { ...this.load() };
  }

  async saveProgress(comicId: string, currentPage: number, totalPages: number): Promise<ReadingProgress> {
    const all = this.load();
    const clampedPage = Math.max(1, Math.min(currentPage, totalPages));
    const percentage = Math.round((clampedPage / totalPages) * 100);
    const status: ComicStatus = percentage >= 100 ? "completed" : percentage > 0 ? "reading" : "not_started";
    const now = new Date().toISOString();

    const progress: ReadingProgress = {
      comicId,
      currentPage: clampedPage,
      totalPages,
      percentage,
      status,
      lastReadAt: now,
      updatedAt: now,
    };

    all[comicId] = progress;
    this.persist(all);
    return progress;
  }

  async updateStatus(comicId: string, status: ComicStatus, totalPages: number): Promise<ReadingProgress> {
    const all = this.load();
    const now = new Date().toISOString();
    let currentPage = 1;

    if (status === "completed") {
      currentPage = totalPages;
    } else if (status === "not_started") {
      currentPage = 0;
    } else {
      // reading
      currentPage = all[comicId]?.currentPage || Math.max(1, Math.floor(totalPages / 2));
    }

    const percentage = Math.round((currentPage / totalPages) * 100);

    const progress: ReadingProgress = {
      comicId,
      currentPage,
      totalPages,
      percentage,
      status,
      lastReadAt: now,
      updatedAt: now,
    };

    all[comicId] = progress;
    this.persist(all);
    return progress;
  }

  async markCompleted(comicId: string, totalPages: number): Promise<ReadingProgress> {
    return this.updateStatus(comicId, "completed", totalPages);
  }

  async resetProgress(comicId: string): Promise<void> {
    const all = this.load();
    delete all[comicId];
    this.persist(all);
  }

  async getContinueReading(limit = 6): Promise<Comic[]> {
    void limit;
    return [];
  }
}

export const localProgressRepository = new LocalProgressRepository();
