import type { Series } from "../types/comic";

export const normalizeSeriesName = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "").trim();

export const isPhaseTitle = (title: string) => /\bnovos?\s*52\b/i.test(title);

export function suggestParentSeries(title: string, publisher: string, series: Series[]): Series | undefined {
  const normalizedTitle = normalizeSeriesName(title);
  if (!normalizedTitle || !publisher.trim()) return undefined;
  return series.filter((item) => !item.parentSeriesId && item.publisher.toLowerCase() === publisher.trim().toLowerCase()
    && item.bannerTone !== "saga" && item.bannerTone !== "phase" && item.bannerTone !== "one_shot"
    && normalizeSeriesName(item.title).length > 3 && normalizedTitle.includes(normalizeSeriesName(item.title)))
    .sort((a, b) => normalizeSeriesName(b.title).length - normalizeSeriesName(a.title).length)[0];
}

export function suggestIssueSeries(fileName: string, title: string, series: Series[]): Series | undefined {
  const source = normalizeSeriesName(`${fileName} ${title}`);
  const match = series.filter((item) => normalizeSeriesName(item.title).length > 3 && source.includes(normalizeSeriesName(item.title)))
    .sort((a, b) => normalizeSeriesName(b.title).length - normalizeSeriesName(a.title).length)[0];
  // An ambiguous filename such as "Aquaman #01.pdf" must not silently put a
  // New 52 issue in the umbrella collection instead of its reading phase.
  if (match && !match.parentSeriesId && series.some((item) => item.parentSeriesId === match.id && item.bannerTone === "phase")) return undefined;
  return match;
}
