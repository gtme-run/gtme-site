import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import Script from "next/script";
import SiteHeader from "@/components/SiteHeader";
import "./globals.css";

// Three faces, one job each (DESIGN.md): Space Grotesk for display, Inter
// for reading, JetBrains Mono for anything typed, run, or read as data.
const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const sans = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-code", display: "swap" });

// Google Analytics 4, production only. The measurement id is public by nature.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "G-T5N05KEM21";
const GA_ON = process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_GA_OFF !== "1";

export const metadata: Metadata = {
  metadataBase: new URL("https://gtme.run"),
  title: {
    default: "/gtme: GTM pipelines in Claude Code",
    template: "%s · /gtme",
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
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <SiteHeader />
        <main className="site-main">{children}</main>
        <footer className="site-footer">
          <div className="site-footer-inner">
            <span className="site-footer-links">
              <a href="https://github.com/gtme-run/gtme/blob/main/LICENSE">Apache-2.0</a>
              <a href="https://github.com/gtme-run/gtme">github.com/gtme-run/gtme</a>
            </span>
            <a href="/" className="wordmark">
              gtme.run
            </a>
          </div>
        </footer>
        {GA_ON ? (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
            <Script id="ga4" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
            </Script>
          </>
        ) : null}
      </body>
    </html>
  );
}
