"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The one site header. The root layout renders it, so every page (home,
// docs, connectors, a 404) gets the same nav at the same width.

const NAV = [
  { href: "/docs", label: "docs", match: "/docs" },
  { href: "/registry", label: "connectors", match: "/registry" },
] as const;

export default function SiteHeader() {
  const path = usePathname() ?? "/";
  const active = (match: string) => path === match || path.startsWith(match + "/");
  return (
    <header className="site-header">
      <nav aria-label="Site" className="site-header-inner">
        <Link href="/" className="brand" aria-label="/gtme home">
          <span className="slash">/</span>gtme
        </Link>
        <ul className="site-nav">
          {NAV.map((n) => (
            <li key={n.href}>
              <Link
                href={n.href}
                className={active(n.match) ? "current" : undefined}
                aria-current={active(n.match) ? "page" : undefined}
              >
                {n.label}
              </Link>
            </li>
          ))}
          <li>
            <a href="https://github.com/gtme-run/gtme">github ↗</a>
          </li>
        </ul>
      </nav>
    </header>
  );
}
