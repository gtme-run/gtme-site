// The docs data layer. One source, chosen by env:
//
//   DOCS_DIR set  -> read markdown from that local directory (local preview);
//                    SPEC.md and DECISIONS.md come from its parent directory.
//   otherwise     -> fetch raw files from GitHub at DOCS_REF (default "main"),
//                    revalidated every 5 minutes.
//
// A 404 from GitHub means "not written yet" and is cached like a hit, so the
// sidebar can ask about every outline entry on each render without refetching.

import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import yaml from "js-yaml";
import { buildGlossary, type Glossary, type GlossaryEntry } from "./glossary.ts";

const REPO_RAW = `https://raw.githubusercontent.com/gtme-run/gtme/${
  process.env.DOCS_REF ?? "main"
}`;
const TTL_MS = 300_000;

export type DocLink = { to: string; type?: string; description?: string };

export type DocFrontmatter = {
  name?: string;
  description?: string;
  order?: number;
  for?: string; // who the page is for, and when
  learn?: string[]; // 2 to 4 short items
  links?: DocLink[];
  entries?: GlossaryEntry[]; // glossary.md only: one per term, written by the generator
};

export type Doc = {
  file: string; // path within docs/, e.g. "concepts/ledger.md"
  data: DocFrontmatter;
  content: string; // markdown body, frontmatter removed
};

export type OutlineEntry = {
  slug: string;
  name?: string;
  status?: string;
  children?: string[];
};

export type Outline = {
  collections: Record<string, OutlineEntry[]>;
  pages?: OutlineEntry[]; // single pages outside the collections (the glossary)
  canon?: string[];
};

function localDocsDir(): string | null {
  const dir = process.env.DOCS_DIR;
  return dir ? path.resolve(dir) : null;
}

// Remote reads, memoized per instance for 5 minutes (misses included).
const memo = new Map<string, { at: number; text: string | null }>();

/** Fetch a public text file; null on 404 or any failure. Cached 5 minutes. */
export async function fetchRaw(url: string): Promise<string | null> {
  const hit = memo.get(url);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.text;
  let text: string | null;
  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (res.ok) text = await res.text();
    else if (res.status === 404) text = null;
    else return null; // transient failure: don't cache it
  } catch {
    return null;
  }
  memo.set(url, { at: Date.now(), text });
  return text;
}

async function readLocal(root: string, rel: string): Promise<string | null> {
  const file = path.resolve(root, rel);
  if (file !== root && !file.startsWith(root + path.sep)) return null;
  try {
    return await fs.readFile(file, "utf8");
  } catch {
    return null;
  }
}

/** Raw text of a file under docs/, or null if it doesn't exist. */
export async function readDocsText(rel: string): Promise<string | null> {
  const dir = localDocsDir();
  return dir ? readLocal(dir, rel) : fetchRaw(`${REPO_RAW}/docs/${rel}`);
}

/** Raw text of a file at the repo root (SPEC.md, DECISIONS.md). */
export async function readRepoText(rel: string): Promise<string | null> {
  const dir = localDocsDir();
  return dir ? readLocal(path.dirname(dir), rel) : fetchRaw(`${REPO_RAW}/${rel}`);
}

/** Read and parse one docs file by its path within docs/ ("concepts/ledger.md"). */
export async function readDoc(file: string): Promise<Doc | null> {
  const raw = await readDocsText(file);
  if (raw === null) return null;
  const parsed = matter(raw);
  return { file, data: parsed.data as DocFrontmatter, content: parsed.content };
}

/** Read and parse docs/_outline.yaml. */
export async function readOutline(): Promise<Outline | null> {
  const raw = await readDocsText("_outline.yaml");
  if (raw === null) return null;
  const parsed = yaml.load(raw) as Partial<Outline> | undefined;
  if (!parsed || typeof parsed.collections !== "object") return null;
  return {
    collections: parsed.collections ?? {},
    pages: Array.isArray(parsed.pages) ? parsed.pages : [],
    canon: parsed.canon,
  };
}

/** Where an image under /_assets/ is served from. */
export function assetSrc(assetPath: string): string {
  const rel = assetPath.replace(/^\/+/, ""); // "_assets/anim/x.png"
  if (localDocsDir()) return `/docs-assets/${rel.replace(/^_assets\//, "")}`;
  return `${REPO_RAW}/docs/${rel}`;
}

/** Local-preview only: bytes of a file under DOCS_DIR/_assets. */
export async function readLocalAsset(rel: string): Promise<Buffer | null> {
  const dir = localDocsDir();
  if (!dir) return null;
  const root = path.join(dir, "_assets");
  const file = path.resolve(root, rel);
  if (!file.startsWith(root + path.sep)) return null;
  try {
    return await fs.readFile(file);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// The site map: outline + which pages exist + their frontmatter.

export type NavPage = {
  route: string; // "concepts/ledger", "reference/cli/show"
  label: string;
  order: number;
  doc: Doc | null; // null = not written yet
  children: NavPage[];
};

export type NavCollection = {
  key: string;
  route: string; // "concepts"
  label: string;
  doc: Doc | null; // the collection's index.md
  pages: NavPage[];
};

export type Site = {
  root: Doc | null; // docs/index.md
  collections: NavCollection[];
  pages: NavPage[]; // outline `pages:`, shown under Overview
  byRoute: Map<string, NavPage | NavCollection>;
};

// A page is <route>.md, or <route>/index.md when it is a folder node.
async function readPage(route: string): Promise<Doc | null> {
  return (await readDoc(`${route}.md`)) ?? (await readDoc(`${route}/index.md`));
}

function byOrder(a: NavPage, b: NavPage) {
  return a.order - b.order;
}

function titleCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export async function getSite(): Promise<Site | null> {
  const outline = await readOutline();
  if (!outline) return null;
  const byRoute = new Map<string, NavPage | NavCollection>();

  const collections = await Promise.all(
    Object.entries(outline.collections).map(async ([key, entries]) => {
      const pages = await Promise.all(
        (entries ?? []).map(async (e, i) => {
          const route = `${key}/${e.slug}`;
          const [doc, children] = await Promise.all([
            readPage(route),
            Promise.all(
              (e.children ?? []).map(async (c, j) => {
                const croute = `${route}/${c}`;
                const cdoc = await readPage(croute);
                const child: NavPage = {
                  route: croute,
                  label: cdoc?.data.name ?? c,
                  order: numberOr(cdoc?.data.order, j + 1),
                  doc: cdoc,
                  children: [],
                };
                byRoute.set(croute, child);
                return child;
              }),
            ),
          ]);
          const page: NavPage = {
            route,
            label: doc?.data.name ?? e.name ?? e.slug,
            // Outline position is the fallback, so written and planned pages interleave.
            order: numberOr(doc?.data.order, i + 1),
            doc,
            children: children.sort(byOrder),
          };
          byRoute.set(route, page);
          return page;
        }),
      );
      const doc = await readDoc(`${key}/index.md`);
      const collection: NavCollection = {
        key,
        route: key,
        label: doc?.data.name ?? titleCase(key),
        doc,
        pages: pages.sort(byOrder),
      };
      byRoute.set(key, collection);
      return collection;
    }),
  );

  const pages = await Promise.all(
    (outline.pages ?? []).map(async (e, i) => {
      const doc = await readPage(e.slug);
      const page: NavPage = {
        route: e.slug,
        label: doc?.data.name ?? e.name ?? e.slug,
        order: numberOr(doc?.data.order, i + 1),
        doc,
        children: [],
      };
      byRoute.set(e.slug, page);
      return page;
    }),
  );

  return { root: await readDoc("index.md"), collections, pages: pages.sort(byOrder), byRoute };
}

/** The glossary's terms, keyed for lookup; empty until glossary.md exists. */
export function glossaryOf(site: Site): Glossary {
  const entry = site.byRoute.get("glossary");
  const entries = entry && "doc" in entry ? entry.doc?.data.entries : undefined;
  return buildGlossary(entries, (route) => site.byRoute.get(route)?.label);
}

function numberOr(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

/** Written pages of a collection, flattened in order (parents before children). */
export function writtenPages(c: NavCollection): NavPage[] {
  return c.pages.flatMap((p) => [p, ...p.children]).filter((p) => p.doc);
}
