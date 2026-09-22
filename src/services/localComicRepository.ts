import { ComicRepository } from "../types/repositories";
import { Character, Comic, LibraryFilters, Series } from "../types/comic";
import { MOCK_CHARACTERS, MOCK_COMICS, MOCK_SERIES } from "../data/mockComics";
import { localProgressRepository } from "./localProgressRepository";
import { localFavoriteRepository } from "./localFavoriteRepository";

export class LocalComicRepository implements ComicRepository {
  private comics: Comic[] = [...MOCK_COMICS];

  /**
   * Enriquece o quadrinho com progresso atualizado e status de favorito
   */
  private async enrichComic(comic: Comic): Promise<Comic> {
    const [progress, isFavorite] = await Promise.all([
      localProgressRepository.getProgress(comic.id),
      localFavoriteRepository.isFavorite(comic.id),
    ]);

    return {
      ...comic,
      isFavorite,
      progress: progress || {
        comicId: comic.id,
        currentPage: 0,
        totalPages: comic.totalPages,
        percentage: 0,
        status: "not_started",
        lastReadAt: "",
        updatedAt: "",
      },
    };
  }

  async getAll(): Promise<Comic[]> {
    return Promise.all(this.comics.map((c) => this.enrichComic(c)));
  }

  async getById(id: string): Promise<Comic | null> {
    const found = this.comics.find((c) => c.id === id);
    if (!found) return null;
    return this.enrichComic(found);
  }

  async getBySeries(seriesId: string): Promise<Comic[]> {
    const list = this.comics.filter((c) => c.seriesId === seriesId);
    return Promise.all(list.map((c) => this.enrichComic(c)));
  }

  async getRecentlyAdded(limit = 6): Promise<Comic[]> {
    const sorted = [...this.comics].sort(
      (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
    );
    return Promise.all(sorted.slice(0, limit).map((c) => this.enrichComic(c)));
  }

  async getSeriesList(): Promise<Series[]> {
    return [...MOCK_SERIES];
  }

  async getCharactersList(): Promise<Character[]> {
    return [...MOCK_CHARACTERS];
  }

  async getPublishers(): Promise<string[]> {
    const set = new Set<string>();
    this.comics.forEach((c) => set.add(c.publisher));
    return Array.from(set).sort();
  }

  async getYears(): Promise<number[]> {
    const set = new Set<number>();
    this.comics.forEach((c) => set.add(c.year));
    return Array.from(set).sort((a, b) => b - a);
  }

  async searchAndFilter(filters: LibraryFilters): Promise<Comic[]> {
    let result = await this.getAll();

    // Filtro de busca textual (título, série, personagens, roteirista, tags)
    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.seriesTitle.toLowerCase().includes(q) ||
          c.characters.some((char) => char.toLowerCase().includes(q)) ||
          c.writers.some((w) => w.toLowerCase().includes(q)) ||
          c.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Filtro por Série
    if (filters.series && filters.series !== "all") {
      result = result.filter((c) => c.seriesId === filters.series);
    }

    // Filtro por Personagem
    if (filters.character && filters.character !== "all") {
      result = result.filter((c) =>
        c.characters.some((char) => char.toLowerCase() === filters.character.toLowerCase())
      );
    }

    // Filtro por Editora
    if (filters.publisher && filters.publisher !== "all") {
      result = result.filter((c) => c.publisher.toLowerCase() === filters.publisher.toLowerCase());
    }

    // Filtro por Ano
    if (filters.year && filters.year !== "all") {
      const targetYear = parseInt(filters.year, 10);
      result = result.filter((c) => c.year === targetYear);
    }

    // Filtro por Status
    if (filters.status && filters.status !== "all") {
      result = result.filter((c) => c.progress?.status === filters.status);
    }

    // Filtro por Favoritos
    if (filters.favoritesOnly) {
      result = result.filter((c) => c.isFavorite);
    }

    // Ordenação
    result.sort((a, b) => {
      switch (filters.sortBy) {
        case "title_asc":
          return a.title.localeCompare(b.title, "pt-BR");
        case "title_desc":
          return b.title.localeCompare(a.title, "pt-BR");
        case "issue_asc":
          return a.issueNumber - b.issueNumber;
        case "issue_desc":
          return b.issueNumber - a.issueNumber;
        case "year_asc":
          return a.year - b.year;
        case "year_desc":
          return b.year - a.year;
        case "last_read_desc": {
          const dateA = a.progress?.lastReadAt ? new Date(a.progress.lastReadAt).getTime() : 0;
          const dateB = b.progress?.lastReadAt ? new Date(b.progress.lastReadAt).getTime() : 0;
          return dateB - dateA;
        }
        case "added_at_desc":
        default:
          return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
      }
    });

    return result;
  }
}

export const localComicRepository = new LocalComicRepository();
