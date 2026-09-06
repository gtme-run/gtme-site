import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://gtme.run"),
  title: {
    default: "gtme — GTM as code",
    template: "%s · gtme",
  },
  description:
    "gtme is an open-source CLI for engineers who do GTM. Campaigns are YAML pipelines, the ledger is SQLite, every run ends in a receipt.",
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
            <Link href="/get">get</Link>
            <span className="sep" aria-hidden="true">
              ·
            </span>
            <Link href="/start">start</Link>
            <span className="sep" aria-hidden="true">
              ·
            </span>
            <a href="https://github.com/elegant-atomics/gtme">GitHub</a>
          </nav>
        </header>
        <main className="site-main">{children}</main>
        <footer className="site-footer">
          <a href="https://github.com/elegant-atomics/gtme/blob/main/LICENSE">
            Apache-2.0
          </a>
          <span className="sep" aria-hidden="true">
            ·
          </span>
          <a href="https://github.com/elegant-atomics/gtme">
            github.com/elegant-atomics/gtme
          </a>
        </footer>
      </body>
    </html>
  );
}
