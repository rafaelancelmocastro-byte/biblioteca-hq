import type { Comic } from "../types/comic";

export function readingInsights(comics: Comic[], year = new Date().getFullYear()) {
  const read = comics.filter((comic) => comic.progress?.status === "completed");
  const readThisYear = read.filter((comic) => comic.progress?.lastReadAt?.startsWith(String(year)));
  const pagesThisYear = readThisYear.reduce((total, comic) => total + comic.totalPages, 0);
  const pending = comics.filter((comic) => comic.progress?.status === "reading");
  const signals = comics.filter((comic) => comic.isFavorite || comic.progress?.status === "reading" || comic.progress?.status === "completed");
  const rank = (values: string[]) => [...values.reduce((map, value) => map.set(value, (map.get(value) || 0) + 1), new Map<string, number>())].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name]) => name);
  return { year, readThisYear: readThisYear.length, pagesThisYear, pending: pending.length, favoriteCharacters: rank(signals.flatMap((comic) => comic.characters)), favoritePublishers: rank(signals.map((comic) => comic.publisher).filter(Boolean)), signals };
}
