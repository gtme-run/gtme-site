import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConnectorTable } from "@/components/Catalog";
import { getCatalog } from "@/lib/catalog";
import { vendorFor } from "@/lib/vendors";

export const revalidate = 300;

type Props = { params: Promise<{ vendor: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { vendor } = await params;
  const v = vendorFor(vendor);
  const { connectors } = await getCatalog();
  const ops = connectors.filter((c) => c.vendor === vendor);
  if (ops.length === 0) return { title: "Connectors" };
  return {
    title: `${v.name} connectors`,
    description: v.blurb || `${ops.length} ${v.name} connector${ops.length === 1 ? "" : "s"} for gtme pipelines.`,
  };
}

export default async function VendorPage({ params }: Props) {
  const { vendor } = await params;
  const { connectors } = await getCatalog();
  const ops = connectors.filter((c) => c.vendor === vendor);
  if (ops.length === 0) notFound();
  const v = vendorFor(vendor);

  return (
    <article className="registry">
      <p className="crumbs">
        <Link href="/registry">Connectors</Link>
      </p>
      <h1>{v.name}</h1>
      {v.blurb ? <p className="lede">{v.blurb}</p> : null}
      <ConnectorTable connectors={ops} />
      {v.url ? (
        <p className="small muted">
          <a href={v.url}>{v.url.replace(/^https?:\/\//, "")}</a> is the vendor&apos;s own site. gtme is not affiliated
          with it; the connector calls its public API with your key.
        </p>
      ) : null}
    </article>
  );
}
