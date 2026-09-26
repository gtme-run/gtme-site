import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import Mermaid from "./Mermaid";
import PipelineFigure from "./PipelineFigure";
import Bindings from "./Bindings";
import { assetSrc } from "@/lib/docs";
import { routeOf, termForCode, termForLink, type Glossary, type Term } from "@/lib/glossary";
import { parsePipeline } from "@/lib/pipeline";
import {
  annotateOutput,
  annotateYaml,
  bindInline,
  scanBindings,
  type Bindings as PageBindings,
  type Line,
} from "@/lib/bindings";

const REPO_BLOB = "https://github.com/gtme-run/gtme/blob/main/";

// Loose hast node shape; enough to read a code block's class and text.
type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: { className?: unknown };
  children?: HastNode[];
};

function toText(node?: HastNode): string {
  if (!node) return "";
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(toText).join("");
}

function hasLanguage(code: HastNode | undefined, lang: string): boolean {
  const cls = code?.properties?.className;
  return code?.tagName === "code" && Array.isArray(cls) && cls.includes(`language-${lang}`);
}

// A code block as lines, each carrying the step and token it is about, so
// the hover binding can light one line of the YAML or one row of a receipt.
function Lines({ lines, className }: { lines: Line[]; className?: string }) {
  const last = lines.length - 1;
  return (
    <pre>
      <code className={className}>
        {lines.map((l, i) =>
          i === last && l.text === "" ? null : (
            <span key={i} className="ln" data-step={l.step} data-token={l.token}>
              {l.text}
              {"\n"}
            </span>
          ),
        )}
      </code>
    </pre>
  );
}

// A short stable id for a block, so two figures on one page get distinct
// SVG marker ids.
function blockId(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return "pf" + (h >>> 0).toString(36);
}

// Docs pages link root-relative (/concepts/ledger, /spec#3-...); the site
// serves them under /docs. Canon files link to each other by filename.
function resolveHref(href: string | undefined, canon: boolean) {
  if (!href) return href;
  if (/^([a-z][a-z0-9+.-]*:|#)/i.test(href)) return href;
  if (href.startsWith("/_assets/")) return assetSrc(href);
  if (href.startsWith("/")) return href === "/" ? "/docs" : "/docs" + href;
  if (canon) {
    const m = href.match(/^(?:\.\/)?(SPEC|DECISIONS)\.md(#.*)?$/);
    if (m) return `/docs/${m[1].toLowerCase()}${m[2] ?? ""}`;
    return REPO_BLOB + href.replace(/^\.?\//, "");
  }
  return href;
}

function Heading({
  level,
  node,
  children,
  ...props
}: {
  level: 2 | 3 | 4;
  node?: HastNode;
  children?: React.ReactNode;
} & React.HTMLAttributes<HTMLHeadingElement>) {
  const Tag = `h${level}` as const;
  // "ADR-002: The ledger is the bus" is linked as #adr-002, so give it that
  // short anchor alongside the full slug rehype-slug assigns.
  const adr = toText(node).match(/^(ADR-\d+)\b/i);
  return (
    <Tag {...props}>
      {adr ? <span id={adr[1].toLowerCase()} className="anchor" /> : null}
      {children}
    </Tag>
  );
}

// A glossary term carries its card's contents on the element, so the
// hover card (components/TermCards) needs no lookup of its own.
function termAttrs(t: Term) {
  return {
    "data-term": t.term,
    "data-def": t.definition,
    "data-page": resolveHref("/" + t.route, false),
    "data-page-label": t.pageLabel ?? t.route,
  };
}

export default function DocsMarkdown({
  children,
  canon = false,
  unwritten,
  bindings: given,
  bind = true,
  terms,
  route,
}: {
  children: string;
  canon?: boolean;
  // Outline routes with no file yet; links to them render as plain text.
  unwritten?: Set<string>;
  // The glossary, when a term in code font or a link to a term's page
  // should get a hover card; `route` is the page being rendered, so the
  // term's own page gets none.
  terms?: Glossary;
  route?: string;
  // A page rendered in pieces passes the bindings of the whole page...
  bindings?: PageBindings;
  // ...and mounts the hover binder itself, once.
  bind?: boolean;
}) {
  const bindings = given ?? scanBindings(children);
  return (
    <>
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSlug]}
      components={{
        a: ({ node, href, children }) => {
          const target = routeOf(href);
          if (target !== null && unwritten?.has(target)) {
            return (
              <span className="unwritten" title="not written yet">
                {children}
              </span>
            );
          }
          const t = terms ? termForLink(toText(node as HastNode), href, terms, route) : undefined;
          return (
            <a href={resolveHref(href, canon)} className={t ? "term" : undefined} {...(t ? termAttrs(t) : {})}>
              {children}
            </a>
          );
        },
        img: ({ src, alt }) => (
          <img
            src={typeof src === "string" ? resolveHref(src, canon) : undefined}
            alt={alt ?? ""}
          />
        ),
        // A table fills the column and scrolls sideways inside its own box
        // when it is wider, so every table on a page has one width.
        table: ({ node: _node, ...p }) => (
          <div className="table-scroll">
            <table {...p} />
          </div>
        ),
        h2: ({ node, ...p }) => <Heading level={2} node={node as HastNode} {...p} />,
        h3: ({ node, ...p }) => <Heading level={3} node={node as HastNode} {...p} />,
        h4: ({ node, ...p }) => <Heading level={4} node={node as HastNode} {...p} />,
        // Backticks in prose that name a step or a token on this page bind to
        // it. Block code has a trailing newline; inline code never does.
        code: ({ node, className, children }) => {
          const text = toText(node as HastNode);
          const inline = !text.includes("\n");
          const b = inline ? bindInline(text, bindings) : undefined;
          const t = inline && terms ? termForCode(text, terms, route) : undefined;
          return (
            <code
              className={[className, t ? "term" : undefined].filter(Boolean).join(" ") || undefined}
              data-step={b?.step}
              data-token={b?.token}
              tabIndex={t ? 0 : undefined}
              {...(t ? termAttrs(t) : {})}
            >
              {children}
            </code>
          );
        },
        pre: ({ node, children }) => {
          const code = (node as HastNode | undefined)?.children?.[0];
          if (hasLanguage(code, "mermaid")) {
            return <Mermaid source={toText(code).replace(/\n$/, "")} />;
          }
          // A whole pipeline in a yaml block gets its figure beside it. The
          // markdown is untouched; GitHub and MCP readers see the block alone.
          if (hasLanguage(code, "yaml")) {
            const text = toText(code);
            const pipeline = parsePipeline(text);
            if (pipeline) {
              return (
                <div className="pipeline-block">
                  <Lines lines={annotateYaml(text)} className="language-yaml" />
                  <PipelineFigure pipeline={pipeline} id={blockId(text)} />
                </div>
              );
            }
          }
          // A run's output (no language) binds its receipt rows and progress
          // lines to the steps named on the page.
          const cls = code?.properties?.className;
          if (code?.tagName === "code" && !cls) {
            const lines = annotateOutput(toText(code), bindings.steps);
            if (lines) return <Lines lines={lines} />;
          }
          return <pre>{children}</pre>;
        },
      }}
    >
      {children}
    </ReactMarkdown>
    {bind && bindings.steps.size > 0 ? <Bindings /> : null}
    </>
  );
}
