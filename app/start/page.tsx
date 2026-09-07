import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const metadata: Metadata = {
  title: "Start here",
  description:
    "Install gtme and walk one of four doors to a receipt. Nothing is sent and nothing is spent until a door says so.",
};

const START_RAW =
  "https://raw.githubusercontent.com/gtme-run/gtme/main/START.md";
const START_HTML = "https://github.com/gtme-run/gtme/blob/main/START.md";
const REPO_BLOB = "https://github.com/gtme-run/gtme/blob/main/";

// Rendered from the repo's START.md at request time; revalidated every 5 minutes.
export const revalidate = 300;

async function loadStart(): Promise<string | null> {
  try {
    const res = await fetch(START_RAW, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

// Relative links in START.md (README, SPEC.md, examples/...) point into the repo.
function resolveHref(href?: string): string | undefined {
  if (!href) return href;
  if (/^(https?:|mailto:|#)/.test(href)) return href;
  return REPO_BLOB + href.replace(/^\.?\//, "");
}

export default async function StartPage() {
  const markdown = await loadStart();

  if (markdown === null) {
    return (
      <article>
        <h1>Start here</h1>
        <p>
          This page renders the repo&apos;s START.md and could not fetch it
          just now. Read it directly at <a href={START_HTML}>{START_HTML}</a>{" "}
          or as raw markdown at <a href="/start.md">gtme.run/start.md</a>.
        </p>
      </article>
    );
  }

  return (
    <article>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => <a href={resolveHref(href)}>{children}</a>,
        }}
      >
        {markdown}
      </ReactMarkdown>
      <hr />
      <p className="small muted">
        Rendered from{" "}
        <a href={START_HTML}>START.md in the gtme repo</a>. Raw markdown for
        agents: <a href="/start.md">gtme.run/start.md</a>.
      </p>
    </article>
  );
}
