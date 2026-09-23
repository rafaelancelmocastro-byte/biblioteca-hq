import { strict as assert } from "node:assert";
import { test } from "node:test";
import type { Comic } from "../types/comic";
import { matchesComicSearch } from "./librarySearch";

const issue = { title: "A Corte das Corujas", seriesTitle: "Batman", publisher: "DC Comics", year: 2011, issueNumber: 0, characters: ["Batman"], writers: [], pencillers: [], tags: [] } as unknown as Comic;

test("finds issue 00 by series, year and number", () => {
  assert.equal(matchesComicSearch(issue, "Batman 2011 #00"), true);
  assert.equal(matchesComicSearch(issue, "Batman edição 0"), true);
  assert.equal(matchesComicSearch(issue, "Batman 2012 #0"), false);
  assert.equal(matchesComicSearch(issue, "Batman 2011 #1"), false);
});

test("matches names and publisher without requiring an exact phrase", () => {
  assert.equal(matchesComicSearch(issue, "DC Batman"), true);
  assert.equal(matchesComicSearch(issue, "corte corujas"), true);
});
