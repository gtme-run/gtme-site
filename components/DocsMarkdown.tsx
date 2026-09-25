import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import Mermaid from "./Mermaid";
import { assetSrc } from "@/lib/docs";

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

// "/concepts/ledger#x" -> "concepts/ledger"; null for anything not root-relative.
function routeOf(href?: string): string | null {
  if (!href || !href.startsWith("/") || href.startsWith("/_assets/")) return null;
  return href.split(/[#?]/)[0].replace(/^\/+|\/+$/g, "");
}

export default function DocsMarkdown({
  children,
  canon = false,
  unwritten,
}: {
  children: string;
  canon?: boolean;
  // Outline routes with no file yet; links to them render as plain text.
  unwritten?: Set<string>;
}) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSlug]}
      components={{
        a: ({ href, children }) => {
          const route = routeOf(href);
          if (route !== null && unwritten?.has(route)) {
            return (
              <span className="unwritten" title="not written yet">
                {children}
              </span>
            );
          }
          return <a href={resolveHref(href, canon)}>{children}</a>;
        },
        img: ({ src, alt }) => (
          <img
            src={typeof src === "string" ? resolveHref(src, canon) : undefined}
            alt={alt ?? ""}
          />
        ),
        h2: ({ node, ...p }) => <Heading level={2} node={node as HastNode} {...p} />,
        h3: ({ node, ...p }) => <Heading level={3} node={node as HastNode} {...p} />,
        h4: ({ node, ...p }) => <Heading level={4} node={node as HastNode} {...p} />,
        pre: ({ node, children }) => {
          const code = (node as HastNode | undefined)?.children?.[0];
          const cls = code?.properties?.className;
          if (
            code?.tagName === "code" &&
            Array.isArray(cls) &&
            cls.includes("language-mermaid")
          ) {
            return <Mermaid source={toText(code).replace(/\n$/, "")} />;
          }
          return <pre>{children}</pre>;
        },
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
