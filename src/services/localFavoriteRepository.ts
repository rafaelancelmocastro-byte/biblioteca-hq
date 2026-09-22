import { FavoriteRepository } from "../types/repositories";
import { INITIAL_FAVORITES_MOCK } from "../data/mockComics";
import { getLocalStorageItem, setLocalStorageItem } from "../lib/utils";

const FAVORITES_STORAGE_KEY = "biblioteca_hq_favorites_v1";

export class LocalFavoriteRepository implements FavoriteRepository {
  private cache: Set<string> | null = null;

  private load(): Set<string> {
    if (this.cache) return this.cache;
    const stored = getLocalStorageItem<string[]>(FAVORITES_STORAGE_KEY, INITIAL_FAVORITES_MOCK);
    this.cache = new Set(stored);
    return this.cache;
  }

  private persist(set: Set<string>): void {
    this.cache = set;
    setLocalStorageItem(FAVORITES_STORAGE_KEY, Array.from(set));
  }

  async getFavoriteIds(): Promise<string[]> {
    return Array.from(this.load());
  }

  async isFavorite(comicId: string): Promise<boolean> {
    return this.load().has(comicId);
  }

  async toggleFavorite(comicId: string): Promise<boolean> {
    const set = this.load();
    const isFav = set.has(comicId);
    if (isFav) {
      set.delete(comicId);
    } else {
      set.add(comicId);
    }
    this.persist(set);
    return !isFav;
  }

  async setFavorite(comicId: string, isFav: boolean): Promise<void> {
    const set = this.load();
    if (isFav) {
      set.add(comicId);
    } else {
      set.delete(comicId);
    }
    this.persist(set);
  }
}

export const localFavoriteRepository = new LocalFavoriteRepository();
