import { test } from "node:test";
import assert from "node:assert/strict";
import { buildGlossary, termForCode, termForLink } from "./glossary.ts";

const entries = [
  { term: "ledger", definition: "The one append-only SQLite file.", page: "/concepts/ledger" },
  { term: "cache window", definition: "The cache duration on a step.", page: "/concepts/facts" },
  { term: "Armed", definition: "gtme run with no flag.", page: "/concepts/gate-ladder" },
];
const labels = new Map([
  ["concepts/ledger", "The ledger"],
  ["concepts/facts", "Facts have provenance"],
]);
const g = buildGlossary(entries, (route) => labels.get(route));

test("buildGlossary keys terms case-insensitively and resolves the owner's label", () => {
  assert.equal(g.size, 3);
  const t = g.get("ledger")!;
  assert.equal(t.route, "concepts/ledger");
  assert.equal(t.pageLabel, "The ledger");
  assert.equal(g.get("armed")!.pageLabel, undefined); // no label known: caller falls back
});

test("buildGlossary drops malformed entries", () => {
  const bad = buildGlossary(
    [{ term: "", definition: "x", page: "/a" }, { term: "x" } as never, null as never],
    () => undefined,
  );
  assert.equal(bad.size, 0);
});

test("termForCode matches the exact text, any case, trimmed", () => {
  assert.equal(termForCode("ledger", g)?.term, "ledger");
  assert.equal(termForCode(" Cache window ", g)?.term, "cache window");
  assert.equal(termForCode("ledgers", g), undefined);
  assert.equal(termForCode("gtme run", g), undefined);
});

test("termForCode gives no card on the owner page or the glossary", () => {
  assert.equal(termForCode("ledger", g, "concepts/ledger"), undefined);
  assert.equal(termForCode("ledger", g, "glossary"), undefined);
  assert.equal(termForCode("ledger", g, "concepts/facts")?.term, "ledger");
});

test("termForLink needs the text to be the term and the target its owner page", () => {
  assert.equal(termForLink("ledger", "/concepts/ledger", g)?.term, "ledger");
  assert.equal(termForLink("ledger", "/concepts/ledger#current-value", g)?.term, "ledger");
  assert.equal(termForLink("Ledger", "/concepts/ledger", g)?.term, "ledger");
  assert.equal(termForLink("ledger", "/concepts/facts", g), undefined);
  assert.equal(termForLink("the ledger", "/concepts/ledger", g), undefined);
  assert.equal(termForLink("ledger", "https://example.com/concepts/ledger", g), undefined);
  assert.equal(termForLink("ledger", undefined, g), undefined);
  assert.equal(termForLink("ledger", "/concepts/ledger", g, "concepts/ledger"), undefined);
});
