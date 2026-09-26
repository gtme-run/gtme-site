import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ConfigTable,
  FieldList,
  FixtureBlock,
  TierBadge,
  connectorTitle,
  costText,
  inlineCode,
  vendorHref,
} from "@/components/Catalog";
import {
  EMBEDDED_BINDINGS,
  getCatalog,
  requiredConfig,
  usageYaml,
  type Connector,
} from "@/lib/catalog";
import { vendorFor } from "@/lib/vendors";

export const revalidate = 300;

type Props = { params: Promise<{ vendor: string; operation: string }> };

async function find(vendor: string, operation: string): Promise<Connector | null> {
  const { connectors } = await getCatalog();
  return connectors.find((c) => c.vendor === vendor && c.operation === operation) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { vendor, operation } = await params;
  const c = await find(vendor, operation);
  if (!c) return { title: "Connectors" };
  return {
    title: `${connectorTitle(c)} connector`,
    description: c.description || `${c.id}: a ${c.manifest.role} adapter for gtme pipelines.`,
  };
}

function recordsText(entity: string) {
  return entity === "*" || entity === "" ? "any type" : entity;
}

function kindText(c: Connector) {
  if (c.tier !== "built-in") return "a binding from the registry";
  return EMBEDDED_BINDINGS[c.id] ? "a binding compiled into the binary" : "a process adapter compiled into the binary";
}

export default async function ConnectorPage({ params }: Props) {
  const { vendor, operation } = await params;
  const c = await find(vendor, operation);
  if (!c) notFound();
  const v = vendorFor(c.vendor);
  const m = c.manifest;
  const required = requiredConfig(m.config_schema).filter(
    (k) => k !== "variables" && k !== "provides" && k !== "of",
  );
  const install = c.install;
  const creds = m.credentials ?? [];

  return (
    <article className="registry connector">
      <p className="crumbs">
        <Link href="/registry">Connectors</Link> › <Link href={vendorHref(c.vendor)}>{v.name}</Link>
      </p>
      <h1>{connectorTitle(c)}</h1>
      {c.description ? <p className="lede">{c.description}</p> : null}

      <table className="facts">
        <tbody>
          <tr>
            <th scope="row">Connector</th>
            <td>
              <code>{c.id}</code>
            </td>
          </tr>
          <tr>
            <th scope="row">Role</th>
            <td>
              {m.role}
              {m.from ? (
                <span className="muted">
                  {" "}
                  from {m.from}
                </span>
              ) : null}
            </td>
          </tr>
          <tr>
            <th scope="row">Records</th>
            <td>{recordsText(m.entity_type)}</td>
          </tr>
          <tr>
            <th scope="row">Tier</th>
            <td>
              <TierBadge tier={c.tier} />
              {c.since ? <span className="muted"> since {c.since}</span> : null}
            </td>
          </tr>
          <tr>
            <th scope="row">Credential</th>
            <td>
              {creds.length === 0 ? (
                <span className="muted">none</span>
              ) : (
                <>
                  {creds.map((k, i) => (
                    <span key={k}>
                      {i > 0 ? ", " : ""}
                      <code>{k}</code>
                    </span>
                  ))}
                  <span className="muted">
                    {" "}
                    stored once with <code>gtme secret set {creds[0]}</code>
                  </span>
                </>
              )}
              {m.credentials_optional?.length ? (
                <div className="muted">
                  Optional:{" "}
                  {m.credentials_optional.map((k, i) => (
                    <span key={k}>
                      {i > 0 ? ", " : ""}
                      <code>{k}</code>
                    </span>
                  ))}
                </div>
              ) : null}
            </td>
          </tr>
          <tr>
            <th scope="row">Cost</th>
            <td>
              {costText(c)}
              {m.cost_estimate_usd === undefined || m.cost_estimate_usd === null ? (
                <span className="muted">
                  {" "}
                  in the manifest; <code>gtme plan</code> prints what the step declares at run time
                </span>
              ) : m.cost_estimate_usd > 0 ? (
                <span className="muted"> estimated; the receipt shows what was spent</span>
              ) : null}
            </td>
          </tr>
          {m.freshness_days ? (
            <tr>
              <th scope="row">Cache</th>
              <td>
                {m.freshness_days} days
                <span className="muted">: a re-run inside the window reads the ledger instead of paying again</span>
              </td>
            </tr>
          ) : null}
          {c.calls ? (
            <tr>
              <th scope="row">Calls</th>
              <td>
                <code>{c.calls}</code>
              </td>
            </tr>
          ) : null}
          <tr>
            <th scope="row">Source</th>
            <td>
              <a href={c.source.href}>{c.source.label}</a>
            </td>
          </tr>
        </tbody>
      </table>

      <h2 id="use">Use it</h2>
      {install ? (
        <>
          <p>Install it from the registry. Nothing installs unverified: the fixtures run offline first.</p>
          <pre>
            <code>{`gtme adapters add ${install}`}</code>
          </pre>
          <p>
            The command prints the hosts the binding will call and the credentials it will ask for, then pins the
            commit it fetched. Then, in a pipeline file:
          </p>
        </>
      ) : (
        <p>It ships inside the binary. In a pipeline file:</p>
      )}
      <pre>
        <code>{usageYaml(c)}</code>
      </pre>
      {required.length > 0 ? (
        <>
          <p>{required.length === 1 ? "Replace the placeholder:" : "Replace the following:"}</p>
          <ul>
            {required.map((k) => (
              <li key={k}>
                <code>{k.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}</code>
                {m.config_schema?.properties?.[k]?.description ? (
                  <>: {inlineCode(lowerFirst(m.config_schema.properties[k].description!))}</>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <p>
        <code>gtme plan pipeline.yaml</code> checks the credential is set and that every field this step needs is
        provided by a step before it, without calling anyone.
      </p>

      <h2 id="needs">Needs</h2>
      {m.role === "source" ? (
        <p className="muted">Nothing. A source starts the pipeline.</p>
      ) : (
        <FieldList
          schema={m.needs}
          emptyText="Whatever fields the step's uses: line names. The runner checks them at plan time."
        />
      )}

      <h2 id="provides">Provides</h2>
      {m.role === "deliver" && !m.provides ? (
        <p className="muted">Nothing. A deliver step writes to the target and records a receipt.</p>
      ) : (
        <FieldList
          schema={m.provides}
          emptyText={
            m.role === "source"
              ? "Whatever the input names. Fields that match canonical names map onto them."
              : "The fields the step's provides: line declares."
          }
        />
      )}

      <h2 id="config">Config</h2>
      <ConfigTable schema={m.config_schema} />

      {c.fixture ? (
        <>
          <h2 id="fixture">What a response looks like</h2>
          <FixtureBlock c={c} />
        </>
      ) : null}

      <p className="small muted">
        On this page, connector means what gtme calls an adapter. This one is {kindText(c)}.{" "}
        <Link href="/docs/concepts/adapter-tiers">Two adapter tiers</Link> explains the difference.
      </p>
    </article>
  );
}

function lowerFirst(s: string) {
  return s.charAt(0).toLowerCase() + s.slice(1);
}
