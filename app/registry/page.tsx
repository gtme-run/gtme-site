import type { Metadata } from "next";
import Link from "next/link";
import { ConnectorTable, vendorHref } from "@/components/Catalog";
import { byVendor, getCatalog } from "@/lib/catalog";
import { vendorFor } from "@/lib/vendors";

// Generated from the gtme repo's adapter listing and the bindings registry
// index at request time; revalidated every 5 minutes.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Connectors",
  description:
    "Every vendor, file, and step gtme can run: Apollo, HubSpot, Attio, Instantly, Harvest, CSV, HTTP, and the AI, agent, and human steps. Each page is generated from the adapter itself.",
};

const KIND_HEADINGS = {
  vendor: { title: "Vendors", text: "APIs that hold or receive your records. Each needs one credential, stored once with gtme secret." },
  file: { title: "Files and HTTP", text: "The floor. A CSV on disk or a URL you control, at either end of a pipeline." },
  step: { title: "Steps", text: "Judgment in the middle of a pipeline: a model, an agent, a person, or a template answers per record." },
} as const;

export default async function RegistryPage() {
  const { connectors, partial } = await getCatalog();
  const groups = byVendor(connectors);
  const kinds = (["vendor", "file", "step"] as const).map((kind) => ({
    kind,
    groups: groups.filter((g) => vendorFor(g.vendor).kind === kind),
  }));

  return (
    <article className="registry">
      <h1>Connectors</h1>
      <p className="lede">
        Every vendor, file, and step gtme can run, on one page. Each entry is generated from the adapter itself, so
        this list can&apos;t say something the binary doesn&apos;t.
      </p>

      <p>
        <strong>gtme&apos;s own word for a connector is adapter.</strong> A connector is what most people search for, so
        it is the word on these pages; in a pipeline file and in the CLI it is an adapter, and the declarative kind is
        a <Link href="/docs/concepts/adapter-tiers">binding</Link>: a directory of YAML and recorded fixtures that
        cannot execute code. Three tiers, one way to use them:
      </p>
      <ul>
        <li>
          <strong>Built in</strong> ships inside the binary. Write <code>use: apollo/search</code> and{" "}
          <code>gtme plan</code> resolves it.
        </li>
        <li>
          <strong>Verified</strong> lives in the{" "}
          <a href="https://github.com/gtme-run/gtme-bindings">gtme-bindings</a> registry, where CI runs its fixtures.{" "}
          <code>gtme adapters add</code> fetches it at a pinned commit, verifies it offline, and installs it.
        </li>
        <li>
          <strong>Community</strong> lives in its author&apos;s repository and is listed in the same index. Same
          install, same verification, maintained by whoever wrote it.
        </li>
      </ul>
      <p>
        An entry whose fixtures stop passing drops off the index, and with it off this page. Agents read the same
        index through <code>gtme adapters search</code>.
      </p>

      {partial ? (
        <p className="muted">
          The built-in listing could not be fetched just now, so only registry entries are shown. The full listing
          is <a href="https://github.com/gtme-run/gtme/blob/main/docs/_adapters.json">docs/_adapters.json</a> in the
          gtme repo.
        </p>
      ) : null}

      {kinds.map(({ kind, groups }) =>
        groups.length === 0 ? null : (
          <section key={kind} aria-labelledby={`kind-${kind}`}>
            <h2 id={`kind-${kind}`}>{KIND_HEADINGS[kind].title}</h2>
            <p className="muted">{KIND_HEADINGS[kind].text}</p>
            {groups.map((g) => {
              const v = vendorFor(g.vendor);
              return (
                <section key={g.vendor} className="catalog-group" aria-labelledby={`vendor-${g.vendor}`}>
                  <h3 id={`vendor-${g.vendor}`}>
                    <Link href={vendorHref(g.vendor)}>{v.name}</Link>
                  </h3>
                  {v.blurb ? <p>{v.blurb}</p> : null}
                  <ConnectorTable connectors={g.connectors} />
                </section>
              );
            })}
          </section>
        ),
      )}

      <h2 id="missing">A vendor that isn&apos;t here</h2>
      <p>
        Write it. A binding is a YAML file and one recorded response per request, and an agent can draft one from the
        vendor&apos;s API docs in a few minutes. <Link href="/docs/start/add-a-vendor">Add a vendor</Link> walks
        through it, <code>gtme help --bindings</code> prints the contract, and a pull request to gtme-bindings puts it
        on this page.
      </p>
    </article>
  );
}
