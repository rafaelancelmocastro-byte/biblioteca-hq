import type { Comic } from "../types/comic";

const fold = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");

/** Matches editorial queries such as "Batman 2011 #0" as well as ordinary text. */
export function matchesComicSearch(comic: Comic, query: string): boolean {
  let terms = fold(query.trim());
  if (!terms) return true;
  const issue = terms.match(/(?:#|(?:edicao|issue|numero|n(?:º|o|\.))\s*)(\d{1,4})\b/);
  if (issue) {
    if (comic.issueNumber !== Number(issue[1])) return false;
    terms = terms.replace(issue[0], " ");
  }
  const year = terms.match(/\b(?:18|19|20)\d{2}\b/);
  if (year) {
    if (comic.year !== Number(year[0])) return false;
    terms = terms.replace(year[0], " ");
  }
  const haystack = fold([comic.title, comic.seriesTitle, comic.publisher, ...comic.characters, ...comic.writers, ...comic.pencillers, ...comic.tags].join(" "));
  return terms.split(/[^\p{L}\p{N}]+/u).filter(Boolean).every((word) => haystack.includes(word));
}
