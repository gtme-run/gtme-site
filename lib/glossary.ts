// The glossary as a lookup: docs/glossary.md carries `entries:` in its
// frontmatter, one {term, definition, page} per term, written by the docs
// generator. The site never parses the glossary's table. A term named in
// code font on a page, or linked to the page that owns it, gets a hover
// card with the definition and a link to that page (components/TermCards).

export type GlossaryEntry = { term: string; definition: string; page: string };

export type Term = {
  term: string; // as the glossary spells it, lowercase
  definition: string;
  route: string; // owner page, "concepts/ledger"
  pageLabel?: string; // the owner page's name, when the site knows it
};

export type Glossary = Map<string, Term>;

// "/concepts/ledger#x" -> "concepts/ledger"; null for anything not root-relative.
export function routeOf(href?: string): string | null {
  if (!href || !href.startsWith("/") || href.startsWith("/_assets/")) return null;
  return href.split(/[#?]/)[0].replace(/^\/+|\/+$/g, "");
}

function key(text: string): string {
  return text.trim().toLowerCase();
}

/** Build the lookup from the glossary's frontmatter entries. */
export function buildGlossary(
  entries: unknown,
  labelOf: (route: string) => string | undefined,
): Glossary {
  const out: Glossary = new Map();
  if (!Array.isArray(entries)) return out;
  for (const e of entries as Partial<GlossaryEntry>[]) {
    if (!e || typeof e.term !== "string" || typeof e.definition !== "string") continue;
    if (typeof e.page !== "string") continue;
    const term = key(e.term);
    const route = routeOf(e.page);
    if (!term || route === null) continue;
    out.set(term, { term, definition: e.definition, route, pageLabel: labelOf(route) });
  }
  return out;
}

// No card where the definition already is: on the term's own page, or on
// the glossary.
function shown(t: Term | undefined, current?: string): Term | undefined {
  if (!t) return undefined;
  if (current === "glossary" || current === t.route) return undefined;
  return t;
}

/** The term a code span names, if its whole text is one. */
export function termForCode(text: string, g: Glossary, current?: string): Term | undefined {
  return shown(g.get(key(text)), current);
}

/** The term a link names: its text is the term and its target the term's page. */
export function termForLink(
  text: string,
  href: string | undefined,
  g: Glossary,
  current?: string,
): Term | undefined {
  const t = g.get(key(text));
  if (!t || routeOf(href) !== t.route) return undefined;
  return shown(t, current);
}
