// The connector catalog: every adapter gtme can resolve, from two sources,
// through one shape.
//
//   built-ins  gtme repo docs/_adapters.json, written by `make docs-adapters`
//              from `gtme help --agent` (so it is the binary's own listing)
//   registry   gtme-bindings index.json, plus each entry's binding.yaml and
//              fixtures fetched at the pinned commit
//
// Nothing here is typed by hand except the words in vendors.ts. A registry
// entry whose fixtures stop passing leaves the index, and with it this page.

import yaml from "js-yaml";
import { fetchRaw, readDocsText, readRepoText } from "./docs.ts";
import { BLURBS, vendorFor, VENDORS } from "./vendors.ts";

const REGISTRY_INDEX =
  process.env.GTME_REGISTRY ??
  "https://raw.githubusercontent.com/gtme-run/gtme-bindings/main/index.json";

// The bindings compiled into the binary (internal/binding/register.go). Their
// fixtures live in the gtme repo; every other built-in is a Go adapter whose
// fixtures take a different shape and are not shown.
export const EMBEDDED_BINDINGS: Record<string, string> = {
  "apollo/search": "apollo-search",
  "apollo/enrich": "apollo-enrich",
  "attio/assert": "attio-assert",
};

export type Schema = {
  type?: string;
  properties?: Record<string, SchemaProperty>;
  required?: string[];
  anyOf?: { required?: string[] }[];
  additionalProperties?: boolean | object;
  dynamic?: boolean;
};

export type SchemaProperty = {
  type?: string | string[];
  description?: string;
  default?: unknown;
  enum?: unknown[];
  items?: { type?: string };
  minimum?: number;
  maximum?: number;
};

export type Manifest = {
  id: string;
  version?: number;
  role: string;
  entity_type: string;
  from?: string;
  needs?: Schema | "dynamic";
  provides?: Schema;
  credentials?: string[];
  credentials_optional?: string[];
  config_schema?: Schema;
  freshness_days?: number;
  cost_estimate_usd?: number | null;
  attests?: boolean;
};

export type Tier = "built-in" | "verified" | "community";

export type FixtureSample = {
  config?: unknown;
  match: string;
  status: number;
  body: unknown;
};

export type Connector = {
  id: string;
  vendor: string; // "hubspot"
  operation: string; // "contact-search"
  tier: Tier;
  manifest: Manifest;
  description: string;
  /** Where the YAML or Go lives, for the reader who wants the whole thing. */
  source: { label: string; href: string };
  /** For a binding: the request it makes, with the default host filled in. */
  calls?: string;
  fixture?: FixtureSample;
  since?: string;
  /** For a registry entry: the argument `gtme adapters add` takes. */
  install?: string;
};

// index.json entry (spec/schemas/registry-index.schema.json).
type IndexEntry = {
  id: string;
  description?: string;
  vendor?: string;
  role?: string;
  entity_type?: string;
  provides?: string[];
  credentials?: string[];
  source: { url: string; path: string; ref?: string; sha?: string };
  sha256?: string;
  tier?: string;
  since?: string;
};

// ---------------------------------------------------------------------------
// Pure helpers (tested in catalog.test.ts).

export function splitId(id: string): { vendor: string; operation: string } {
  const i = id.indexOf("/");
  if (i < 0) return { vendor: id, operation: "" };
  return { vendor: id.slice(0, i), operation: id.slice(i + 1) };
}

/** "github.com/gtme-run/gtme-bindings" → { owner, repo }, or null. */
export function parseRepo(url: string): { owner: string; repo: string } | null {
  const m = url
    .replace(/^https?:\/\//, "")
    .match(/^github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  return m ? { owner: m[1], repo: m[2] } : null;
}

/** Raw URL of a file inside a registry entry, at its pinned commit. */
export function entryRawUrl(source: IndexEntry["source"], file: string): string | null {
  const r = parseRepo(source.url);
  if (!r) return null;
  const at = source.sha || source.ref || "main";
  const dir = source.path.replace(/^\/+|\/+$/g, "");
  return `https://raw.githubusercontent.com/${r.owner}/${r.repo}/${at}/${dir}/${file}`;
}

/** Browsable URL of a registry entry's directory. */
export function entryHref(source: IndexEntry["source"]): string | null {
  const r = parseRepo(source.url);
  if (!r) return null;
  const at = source.sha || source.ref || "main";
  const dir = source.path.replace(/^\/+|\/+$/g, "");
  return `https://github.com/${r.owner}/${r.repo}/tree/${at}/${dir}`;
}

/** The `gtme adapters add` argument for a registry entry. */
export function addRef(source: IndexEntry["source"]): string | null {
  const r = parseRepo(source.url);
  if (!r) return null;
  const dir = source.path.replace(/^\/+|\/+$/g, "");
  const ref = source.ref ? `@${source.ref}` : "";
  return `github.com/${r.owner}/${r.repo}/${dir}${ref}`;
}

type BindingYaml = Partial<Manifest> & {
  cost?: { per?: string; amount_usd?: number | string };
  request?: { method?: string; url?: string };
  auth?: { type?: string };
};

/** binding.yaml text → the manifest surface `gtme plan` sees. */
export function manifestFromBinding(text: string): Manifest | null {
  let b: BindingYaml;
  try {
    b = yaml.load(text) as BindingYaml;
  } catch {
    return null;
  }
  if (!b || typeof b !== "object" || typeof b.id !== "string") return null;
  const cost =
    typeof b.cost_estimate_usd === "number"
      ? b.cost_estimate_usd
      : typeof b.cost?.amount_usd === "number"
        ? b.cost.amount_usd
        : undefined;
  return {
    id: b.id,
    version: b.version,
    role: b.role ?? "",
    entity_type: b.entity_type ?? "",
    from: b.from,
    needs: b.needs,
    provides: b.provides,
    credentials: b.credentials,
    config_schema: b.config_schema,
    freshness_days: b.freshness_days,
    cost_estimate_usd: cost,
  };
}

/** "POST https://api.hubapi.com/crm/v3/objects/contacts/search", from a binding's request. */
export function callsFromBinding(text: string): string | undefined {
  let b: BindingYaml;
  try {
    b = yaml.load(text) as BindingYaml;
  } catch {
    return undefined;
  }
  const url = b?.request?.url;
  if (typeof url !== "string") return undefined;
  const base = b.config_schema?.properties?.base_url?.default;
  const filled =
    typeof base === "string" ? url.replace("{{config.base_url}}", base) : url;
  return `${(b.request?.method ?? "GET").toUpperCase()} ${filled}`;
}

/** fixtures/conformance.json → its first canned response. */
export function fixtureSample(text: string): FixtureSample | undefined {
  let f: { config?: unknown; responses?: FixtureSample[] };
  try {
    f = JSON.parse(text);
  } catch {
    return undefined;
  }
  const r = f?.responses?.[0];
  if (!r || typeof r.match !== "string") return undefined;
  return { config: f.config, match: r.match, status: r.status, body: r.body };
}

/** The config keys a step must set: `required`, or the first `anyOf` branch. */
export function requiredConfig(schema?: Schema): string[] {
  if (!schema) return [];
  if (schema.required?.length) return schema.required;
  const first = schema.anyOf?.find((a) => a.required?.length);
  return first?.required ?? [];
}

/** Field names a schema declares, or null when it is dynamic/open. */
export function fieldNames(schema?: Schema | "dynamic"): string[] | null {
  if (!schema || schema === "dynamic" || schema.dynamic) return null;
  const names = Object.keys(schema.properties ?? {});
  if (names.length === 0 && schema.additionalProperties === true) return null;
  return names;
}

/** The YAML a pipeline needs to use this connector, with placeholders for required config. */
export function usageYaml(c: Connector): string {
  const required = requiredConfig(c.manifest.config_schema).filter(
    (k) => k !== "variables" && k !== "provides" && k !== "of",
  );
  const withBlock = (indent: string) =>
    required.length
      ? `${indent}with:\n` +
        required.map((k) => `${indent}  ${k}: ${k.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`).join("\n")
      : "";
  if (c.manifest.role === "source") {
    return [`source:`, `  use: ${c.id}`, withBlock("  ")].filter(Boolean).join("\n");
  }
  return [`steps:`, `  - id: ${c.operation}`, `    use: ${c.id}`, withBlock("    ")]
    .filter(Boolean)
    .join("\n");
}

/** Group order on the catalog page: vendors, then files and HTTP, then steps. */
export function sortConnectors(list: Connector[]): Connector[] {
  const kindRank = { vendor: 0, file: 1, step: 2 } as const;
  const vendorRank = new Map(VENDORS.map((v, i) => [v.key, i]));
  return [...list].sort((a, b) => {
    const va = vendorFor(a.vendor);
    const vb = vendorFor(b.vendor);
    if (kindRank[va.kind] !== kindRank[vb.kind]) return kindRank[va.kind] - kindRank[vb.kind];
    if (a.vendor !== b.vendor) {
      const ra = vendorRank.get(a.vendor) ?? 999;
      const rb = vendorRank.get(b.vendor) ?? 999;
      return ra !== rb ? ra - rb : a.vendor.localeCompare(b.vendor);
    }
    return a.operation.localeCompare(b.operation);
  });
}

export function connectorFromBuiltin(m: Manifest): Connector {
  const { vendor, operation } = splitId(m.id);
  const dir = EMBEDDED_BINDINGS[m.id];
  const source = dir
    ? {
        label: `spec/bindings/${dir}/binding.yaml`,
        href: `https://github.com/gtme-run/gtme/blob/main/spec/bindings/${dir}/binding.yaml`,
      }
    : {
        label: "internal/adapters",
        href: "https://github.com/gtme-run/gtme/tree/main/internal/adapters",
      };
  return {
    id: m.id,
    vendor,
    operation,
    tier: "built-in",
    manifest: m,
    description: BLURBS[m.id] ?? "",
    source,
  };
}

export function connectorFromEntry(e: IndexEntry, manifest: Manifest | null): Connector {
  const { vendor, operation } = splitId(e.id);
  const m: Manifest = manifest ?? {
    id: e.id,
    role: e.role ?? "",
    entity_type: e.entity_type ?? "",
    credentials: e.credentials,
    provides: e.provides
      ? { type: "object", properties: Object.fromEntries(e.provides.map((p) => [p, {}])) }
      : undefined,
  };
  const href = entryHref(e.source);
  return {
    id: e.id,
    vendor,
    operation,
    tier: e.tier === "verified" ? "verified" : "community",
    manifest: m,
    description: e.description ?? BLURBS[e.id] ?? "",
    source: {
      label: `${e.source.url.replace(/^https?:\/\//, "")}/${e.source.path.replace(/^\/+|\/+$/g, "")}`,
      href: href ?? `https://${e.source.url.replace(/^https?:\/\//, "")}`,
    },
    since: e.since,
    install: addRef(e.source) ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Loading.

async function loadBuiltins(): Promise<Connector[]> {
  const text = await readDocsText("_adapters.json");
  if (!text) return [];
  let doc: { adapters?: Manifest[] };
  try {
    doc = JSON.parse(text);
  } catch {
    return [];
  }
  const list = (doc.adapters ?? []).filter((m) => m && typeof m.id === "string");
  return Promise.all(
    list.map(async (m) => {
      const c = connectorFromBuiltin(m);
      const dir = EMBEDDED_BINDINGS[m.id];
      if (dir) {
        const [binding, fixtures] = await Promise.all([
          readRepoText(`spec/bindings/${dir}/binding.yaml`),
          readRepoText(`spec/bindings/${dir}/fixtures/conformance.json`),
        ]);
        if (binding) c.calls = callsFromBinding(binding);
        if (fixtures) c.fixture = fixtureSample(fixtures);
      }
      return c;
    }),
  );
}

async function loadRegistry(skip: Set<string>): Promise<Connector[]> {
  const text = await fetchRaw(REGISTRY_INDEX);
  if (!text) return [];
  let index: { bindings?: IndexEntry[] };
  try {
    index = JSON.parse(text);
  } catch {
    return [];
  }
  const entries = (index.bindings ?? []).filter(
    (e) => e && typeof e.id === "string" && e.source?.url && e.source?.path && !skip.has(e.id),
  );
  return Promise.all(
    entries.map(async (e) => {
      const bindingUrl = entryRawUrl(e.source, "binding.yaml");
      const fixturesUrl = entryRawUrl(e.source, "fixtures/conformance.json");
      const [binding, fixtures] = await Promise.all([
        bindingUrl ? fetchRaw(bindingUrl) : null,
        fixturesUrl ? fetchRaw(fixturesUrl) : null,
      ]);
      const c = connectorFromEntry(e, binding ? manifestFromBinding(binding) : null);
      if (binding) c.calls = callsFromBinding(binding);
      if (fixtures) c.fixture = fixtureSample(fixtures);
      return c;
    }),
  );
}

export type Catalog = {
  connectors: Connector[];
  /** True when the built-in listing could not be read (the page says so). */
  partial: boolean;
};

export async function getCatalog(): Promise<Catalog> {
  const builtins = await loadBuiltins();
  const registry = await loadRegistry(new Set(builtins.map((c) => c.id)));
  return {
    connectors: sortConnectors([...builtins, ...registry]),
    partial: builtins.length === 0,
  };
}

export function byVendor(list: Connector[]): { vendor: string; connectors: Connector[] }[] {
  const out: { vendor: string; connectors: Connector[] }[] = [];
  for (const c of list) {
    const last = out[out.length - 1];
    if (last && last.vendor === c.vendor) last.connectors.push(c);
    else out.push({ vendor: c.vendor, connectors: [c] });
  }
  return out;
}
