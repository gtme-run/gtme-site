import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://gtme.run"),
  title: {
    default: "gtme: GTM as code",
    template: "%s · gtme",
  },
  description:
    "A CLI for GTM data pipelines. A YAML file describes a campaign, and an append-only ledger makes re-runs cheaper and never delivers twice.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <nav aria-label="Site">
            <Link href="/" className="brand">
              gtme
            </Link>
            <span className="sep" aria-hidden="true">
              ·
            </span>
            <Link href="/docs">docs</Link>
            <span className="sep" aria-hidden="true">
              ·
            </span>
            <a href="https://github.com/gtme-run/gtme">GitHub</a>
          </nav>
        </header>
        <main className="site-main">{children}</main>
        <footer className="site-footer">
          <a href="https://github.com/gtme-run/gtme/blob/main/LICENSE">
            Apache-2.0
          </a>
          <span className="sep" aria-hidden="true">
            ·
          </span>
          <a href="https://github.com/gtme-run/gtme">
            github.com/gtme-run/gtme
          </a>
        </footer>
      </body>
    </html>
  );
}
