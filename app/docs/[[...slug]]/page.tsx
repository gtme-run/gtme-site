import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import DocsMarkdown from "@/components/DocsMarkdown";
import {
  getSite,
  readRepoText,
  writtenPages,
  type Doc,
  type NavCollection,
  type NavPage,
  type Site,
} from "@/lib/docs";

// Rendered from the gtme repo's docs/ at request time; revalidated every 5 minutes.
export const revalidate = 300;

const DOCS_HTML = "https://github.com/gtme-run/gtme/tree/main/docs";
const CANON: Record<string, { file: string; title: string }> = {
  spec: { file: "SPEC.md", title: "SPEC.md" },
  decisions: { file: "DECISIONS.md", title: "DECISIONS.md" },
};

type Props = { params: Promise<{ slug?: string[] }> };

function href(route: string) {
  return route ? `/docs/${route}` : "/docs";
}

// Body markdown starts with its own "# Title"; lift it out so the
// description can sit directly under it.
function splitTitle(content: string): { title: string | null; body: string } {
  const m = content.match(/^\s*#[ \t]+(.+?)[ \t#]*(?:\r?\n|$)/);
  return m
    ? { title: m[1], body: content.slice(m[0].length) }
    : { title: null, body: content };
}

type Resolved =
  | { kind: "root"; doc: Doc }
  | { kind: "collection"; entry: NavCollection; doc: Doc }
  | { kind: "page"; entry: NavPage; doc: Doc };

// Every outline route that has no file yet (the sidebar's "planned" entries).
function unwrittenRoutes(site: Site): Set<string> {
  const out = new Set<string>();
  for (const [route, entry] of site.byRoute) if (!entry.doc) out.add(route);
  if (!site.root) out.add("");
  return out;
}

function resolve(site: Site, route: string): Resolved | null {
  if (route === "") return site.root ? { kind: "root", doc: site.root } : null;
  const entry = site.byRoute.get(route);
  if (!entry?.doc) return null;
  return "pages" in entry
    ? { kind: "collection", entry, doc: entry.doc }
    : { kind: "page", entry, doc: entry.doc };
}

// A frontmatter link target, if it exists: "/concepts/x", "/spec#3-...", "/decisions#adr-002".
function resolveTarget(site: Site, to: string) {
  const [p, hash] = to.split("#");
  const route = p.replace(/^\/+|\/+$/g, "");
  const suffix = hash ? `#${hash}` : "";
  if (CANON[route]) {
    const adr = hash?.match(/^adr-\d+/i)?.[0];
    const sec = hash?.match(/^(\d+[a-z]?)-/)?.[1];
    const label = adr
      ? adr.toUpperCase()
      : sec
        ? `${CANON[route].title} §${sec}`
        : CANON[route].title;
    return { href: href(route) + suffix, label };
  }
  if (route === "") return site.root ? { href: "/docs" + suffix, label: "Docs home" } : null;
  const entry = site.byRoute.get(route);
  return entry?.doc ? { href: href(route) + suffix, label: entry.label } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const route = ((await params).slug ?? []).join("/");
  if (CANON[route]) return { title: CANON[route].title };
  const site = await getSite();
  const r = site && resolve(site, route);
  if (!r) return { title: "Docs" };
  const title =
    r.doc.data.name ?? splitTitle(r.doc.content).title ?? "Docs";
  return { title, description: r.doc.data.description };
}

function Sidebar({ site, current }: { site: Site; current: string }) {
  const item = (route: string, label: string) =>
    route === current ? (
      <Link href={href(route)} className="current" aria-current="page">
        {label}
      </Link>
    ) : (
      <Link href={href(route)}>{label}</Link>
    );

  const pageItem = (p: NavPage) => (
    <li key={p.route}>
      {p.doc ? item(p.route, p.label) : <span className="planned">{p.label}</span>}
      {p.children.length > 0 ? <ul>{p.children.map(pageItem)}</ul> : null}
    </li>
  );

  return (
    <nav aria-label="Docs" className="docs-nav">
      <p className="docs-nav-home">
        {site.root ? item("", "Overview") : <span className="planned">Overview</span>}
      </p>
      {site.collections.map((c) => (
        <div key={c.key} className="docs-nav-group">
          <p className="docs-nav-title">
            {c.doc ? item(c.route, c.label) : <span>{c.label}</span>}
          </p>
          <ul>{c.pages.map(pageItem)}</ul>
        </div>
      ))}
    </nav>
  );
}

function PrevNext({ site, r }: { site: Site; r: Resolved }) {
  if (r.kind === "root") return null;
  const key = r.kind === "collection" ? r.entry.key : r.entry.route.split("/")[0];
  const collection = site.collections.find((c) => c.key === key);
  if (!collection) return null;
  const list = writtenPages(collection);
  let prev: NavPage | NavCollection | null = null;
  let next: NavPage | null = null;
  if (r.kind === "collection") {
    next = list[0] ?? null;
  } else {
    const i = list.findIndex((p) => p.route === r.entry.route);
    prev = i > 0 ? list[i - 1] : collection.doc ? collection : null;
    next = list[i + 1] ?? null;
  }
  if (!prev && !next) return null;
  return (
    <nav aria-label="Pages in this section" className="docs-prevnext">
      <span>
        {prev ? (
          <Link href={href(prev.route)} rel="prev">
            ← {prev.label}
          </Link>
        ) : null}
      </span>
      <span>
        {next ? (
          <Link href={href(next.route)} rel="next">
            {next.label} →
          </Link>
        ) : null}
      </span>
    </nav>
  );
}

function Related({ site, doc }: { site: Site; doc: Doc }) {
  const links = (doc.data.links ?? [])
    .map((l) => ({ l, t: typeof l?.to === "string" ? resolveTarget(site, l.to) : null }))
    .filter((x) => x.t !== null);
  if (links.length === 0) return null;
  return (
    <section className="docs-related" aria-labelledby="related">
      <h2 id="related">Related</h2>
      <ul>
        {links.map(({ l, t }) => (
          <li key={l.to}>
            <Link href={t!.href}>{t!.label}</Link>
            {l.description ? <span className="muted"> — {l.description}</span> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Unavailable() {
  return (
    <article>
      <h1>Docs</h1>
      <p>
        This page renders the gtme repo&apos;s docs/ folder and could not
        fetch it just now. Read it directly at{" "}
        <a href={DOCS_HTML}>{DOCS_HTML}</a>.
      </p>
    </article>
  );
}

export default async function DocsPage({ params }: Props) {
  const route = ((await params).slug ?? []).join("/");

  if (CANON[route]) {
    const [site, text] = await Promise.all([
      getSite(),
      readRepoText(CANON[route].file),
    ]);
    if (text === null) notFound();
    return (
      <div className="docs">
        <article className="docs-page docs-canon">
          <DocsMarkdown canon unwritten={site ? unwrittenRoutes(site) : undefined}>
            {text}
          </DocsMarkdown>
        </article>
        {site ? <Sidebar site={site} current={route} /> : null}
      </div>
    );
  }

  const site = await getSite();
  if (!site) return <Unavailable />;
  const r = resolve(site, route);
  if (!r) notFound();

  const { title, body } = splitTitle(r.doc.content);
  return (
    <div className="docs">
      <article className="docs-page">
        <h1>{title ?? r.doc.data.name ?? "Docs"}</h1>
        {r.doc.data.description ? (
          <p className="lede">{r.doc.data.description}</p>
        ) : null}
        <DocsMarkdown unwritten={unwrittenRoutes(site)}>{body}</DocsMarkdown>
        <Related site={site} doc={r.doc} />
        <PrevNext site={site} r={r} />
      </article>
      <Sidebar site={site} current={route} />
    </div>
  );
}
