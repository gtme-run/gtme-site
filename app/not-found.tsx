import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Not found" };

// Every notFound() on the site lands here: a docs path, a connector, or any
// other URL. One white card on the gray page, like every other page.
export default function NotFound() {
  return (
    <article className="not-found">
      <p className="eyebrow">404</p>
      <h1>This page isn&apos;t here</h1>
      <p className="lede">The link may be old, or the page may have moved.</p>
      <ul>
        <li>
          <Link href="/docs">The docs</Link> start with installing gtme and running a pipeline offline.
        </li>
        <li>
          <Link href="/registry">Connectors</Link> lists every adapter you can install.
        </li>
      </ul>
    </article>
  );
}
