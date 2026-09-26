import Link from "next/link";
import {
  fieldNames,
  type Connector,
  type Schema,
  type SchemaProperty,
  type Tier,
} from "@/lib/catalog";
import { vendorFor } from "@/lib/vendors";

export function connectorHref(c: Connector) {
  return `/registry/${c.vendor}/${c.operation}`;
}

export function vendorHref(vendor: string) {
  return `/registry/${vendor}`;
}

/** "contact-search" → "contact search". */
export function humanize(operation: string) {
  return operation.replace(/-/g, " ");
}

/** "HubSpot contact search". */
export function connectorTitle(c: Connector) {
  const v = vendorFor(c.vendor);
  return `${v.short ?? v.name} ${humanize(c.operation)}`;
}

/** Backticks in manifest text are inline code; nothing else is parsed. */
export function inlineCode(text: string) {
  return text.split("`").map((part, i) => (i % 2 === 1 ? <code key={i}>{part}</code> : part));
}

const TIER_WORDS: Record<Tier, string> = {
  "built-in": "built in",
  verified: "verified",
  community: "community",
};

export function TierBadge({ tier }: { tier: Tier }) {
  return <span className={`tier tier-${tier}`}>{TIER_WORDS[tier]}</span>;
}

export function costText(c: Connector) {
  const n = c.manifest.cost_estimate_usd;
  if (n === undefined || n === null) return "unset";
  if (n === 0) return "$0";
  return `$${n} per record`;
}

/** Fields as inline code, or a sentence for schemas that have none to list. */
export function FieldList({
  schema,
  emptyText,
}: {
  schema?: Schema | "dynamic";
  emptyText: string;
}) {
  const names = fieldNames(schema);
  if (names === null || names.length === 0) return <p className="muted">{emptyText}</p>;
  return (
    <p className="fields">
      {names.map((n, i) => (
        <span key={n}>
          {i > 0 ? ", " : ""}
          <code>{n}</code>
        </span>
      ))}
    </p>
  );
}

function typeText(p: SchemaProperty) {
  if (p.enum) return p.enum.map(String).join(" | ");
  const t = Array.isArray(p.type) ? p.type.join(" | ") : p.type;
  if (t === "array" && p.items?.type) return `array of ${p.items.type}`;
  return t ?? "";
}

// Keys the runner injects from step-level YAML; they are never written under with:.
const INJECTED = new Set(["variables", "provides", "of", "fetched"]);

export function ConfigTable({ schema }: { schema?: Schema }) {
  const props = schema?.properties ?? {};
  const required = new Set(schema?.required ?? []);
  // Required keys first, then the rest in manifest order.
  const keys = Object.keys(props)
    .filter((k) => !INJECTED.has(k))
    .sort((a, b) => Number(required.has(b)) - Number(required.has(a)));
  if (keys.length === 0) return <p className="muted">No keys under with:.</p>;
  return (
    <table className="config">
      <thead>
        <tr>
          <th>Key</th>
          <th>Type</th>
          <th>What it does</th>
        </tr>
      </thead>
      <tbody>
        {keys.map((k) => {
          const p = props[k];
          return (
            <tr key={k}>
              <td>
                <code>{k}</code>
                {required.has(k) ? <span className="muted"> required</span> : null}
              </td>
              <td className="muted">{typeText(p)}</td>
              <td>
                {p.description ? inlineCode(p.description) : ""}
                {p.default !== undefined ? (
                  <span className="muted">
                    {p.description ? " " : ""}Default <code>{String(p.default)}</code>.
                  </span>
                ) : null}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** The catalog table: one row per connector. */
export function ConnectorTable({ connectors }: { connectors: Connector[] }) {
  return (
    <table className="catalog">
      <thead>
        <tr>
          <th>Connector</th>
          <th>Role</th>
          <th>Cost</th>
          <th>Tier</th>
        </tr>
      </thead>
      <tbody>
        {connectors.map((c) => (
          <tr key={c.id}>
            <td>
              <Link href={connectorHref(c)}>
                <code>{c.id}</code>
              </Link>
              {c.description ? <div className="small muted">{c.description}</div> : null}
            </td>
            <td>{c.manifest.role}</td>
            <td>{costText(c)}</td>
            <td>
              <TierBadge tier={c.tier} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const MAX_FIXTURE_LINES = 40;

/** A fixture body as JSON, cut after a screen's worth of lines. */
export function FixtureBlock({ c }: { c: Connector }) {
  if (!c.fixture) return null;
  const lines = JSON.stringify(c.fixture.body, null, 2).split("\n");
  const cut = lines.length > MAX_FIXTURE_LINES;
  const shown = cut ? lines.slice(0, MAX_FIXTURE_LINES) : lines;
  return (
    <>
      <p>
        Recorded from a real response to <code>{c.fixture.match}</code>, status {c.fixture.status}.
        The conformance kit proves this payload in produces canonical records out, and{" "}
        <code>gtme run --simulate</code> serves it in place of the network.
      </p>
      <pre>
        <code>{shown.join("\n") + (cut ? `\n… ${lines.length - MAX_FIXTURE_LINES} more lines in the fixture file` : "")}</code>
      </pre>
    </>
  );
}
