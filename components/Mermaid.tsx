"use client";

import { useEffect, useId, useState } from "react";

// Loaded from the CDN on first use, so no Mermaid runtime ships in the bundle.
const MERMAID_ESM =
  "https://cdn.jsdelivr.net/npm/mermaid@12.0.0/dist/mermaid.esm.min.mjs";

type MermaidApi = {
  initialize: (config: Record<string, unknown>) => void;
  render: (id: string, source: string) => Promise<{ svg: string }>;
};

let loader: Promise<MermaidApi> | null = null;

// The diagram theme reads the same tokens as the rest of the page.
function themeVariables() {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string) => css.getPropertyValue(name).trim();
  return {
    darkMode: window.matchMedia("(prefers-color-scheme: dark)").matches,
    background: v("--bg"),
    primaryColor: v("--code-bg"),
    primaryTextColor: v("--fg"),
    primaryBorderColor: v("--muted"),
    secondaryColor: v("--code-bg"),
    tertiaryColor: v("--bg"),
    lineColor: v("--muted"),
    textColor: v("--fg"),
    fontFamily: v("--font-sans"),
  };
}

function loadMermaid(): Promise<MermaidApi> {
  loader ??= import(
    /* webpackIgnore: true */ /* turbopackIgnore: true */ MERMAID_ESM
  ).then((mod: { default: MermaidApi }) => {
    const mermaid = mod.default;
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "base",
      themeVariables: themeVariables(),
    });
    return mermaid;
  });
  return loader;
}

export default function Mermaid({ source }: { source: string }) {
  const id = "mermaid-" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadMermaid()
      .then((m) => m.render(id, source))
      .then((out) => {
        if (!cancelled) setSvg(out.svg);
      })
      .catch(() => {
        // Keep the source visible; it is the fallback.
      });
    return () => {
      cancelled = true;
    };
  }, [id, source]);

  if (svg === null) {
    return (
      <pre className="mermaid-source">
        <code className="language-mermaid">{source}</code>
      </pre>
    );
  }
  return (
    <figure
      className="mermaid-diagram"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
