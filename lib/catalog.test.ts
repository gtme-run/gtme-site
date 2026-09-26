import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addRef,
  byVendor,
  callsFromBinding,
  connectorFromBuiltin,
  connectorFromEntry,
  entryHref,
  entryRawUrl,
  fieldNames,
  fixtureSample,
  manifestFromBinding,
  parseRepo,
  requiredConfig,
  sortConnectors,
  splitId,
  usageYaml,
  type Manifest,
} from "./catalog.ts";

const source = {
  url: "github.com/gtme-run/gtme-bindings",
  path: "hubspot-contact-search",
  ref: "main",
  sha: "bcf671b9e1df177ed24e98b58e0c132176261c78",
};

const hubspotYaml = `
id: hubspot/contact-search
version: 1
role: source
entity_type: person
credentials: [HUBSPOT_ACCESS_TOKEN]
cost_estimate_usd: 0
config_schema:
  type: object
  required: [known_property]
  properties:
    known_property: { type: string, description: Contact property that must be set }
    base_url: { type: string, default: "https://api.hubapi.com" }
provides:
  type: object
  properties:
    email: { type: string }
    hubspot.contact_id: { type: string }
request:
  method: POST
  url: "{{config.base_url}}/crm/v3/objects/contacts/search"
cost:
  per: record
  amount_usd: 0
`;

test("splitId separates vendor and operation at the first slash", () => {
  assert.deepEqual(splitId("hubspot/contact-search"), { vendor: "hubspot", operation: "contact-search" });
  assert.deepEqual(splitId("instantly/add-to-campaign"), { vendor: "instantly", operation: "add-to-campaign" });
  assert.deepEqual(splitId("odd"), { vendor: "odd", operation: "" });
});

test("registry source URLs resolve at the pinned commit", () => {
  assert.deepEqual(parseRepo("github.com/gtme-run/gtme-bindings"), { owner: "gtme-run", repo: "gtme-bindings" });
  assert.deepEqual(parseRepo("https://github.com/o/r.git"), { owner: "o", repo: "r" });
  assert.equal(parseRepo("gitlab.com/o/r"), null);
  assert.equal(
    entryRawUrl(source, "binding.yaml"),
    `https://raw.githubusercontent.com/gtme-run/gtme-bindings/${source.sha}/hubspot-contact-search/binding.yaml`,
  );
  assert.equal(
    entryHref(source),
    `https://github.com/gtme-run/gtme-bindings/tree/${source.sha}/hubspot-contact-search`,
  );
  // Without a sha the ref stands in.
  assert.equal(
    entryRawUrl({ ...source, sha: undefined }, "x"),
    "https://raw.githubusercontent.com/gtme-run/gtme-bindings/main/hubspot-contact-search/x",
  );
});

test("addRef is what `gtme adapters add` takes", () => {
  assert.equal(addRef(source), "github.com/gtme-run/gtme-bindings/hubspot-contact-search@main");
  assert.equal(addRef({ ...source, ref: undefined }), "github.com/gtme-run/gtme-bindings/hubspot-contact-search");
});

test("manifestFromBinding lifts the manifest surface and the request", () => {
  const m = manifestFromBinding(hubspotYaml);
  assert.ok(m);
  assert.equal(m.id, "hubspot/contact-search");
  assert.equal(m.role, "source");
  assert.deepEqual(m.credentials, ["HUBSPOT_ACCESS_TOKEN"]);
  assert.equal(m.cost_estimate_usd, 0);
  assert.deepEqual(fieldNames(m.provides), ["email", "hubspot.contact_id"]);
  assert.equal(callsFromBinding(hubspotYaml), "POST https://api.hubapi.com/crm/v3/objects/contacts/search");
  assert.equal(manifestFromBinding("just: text"), null);
  assert.equal(manifestFromBinding(": not yaml ["), null);
});

test("cost falls back to cost.amount_usd when cost_estimate_usd is absent", () => {
  const m = manifestFromBinding("id: a/b\nrole: enrich\nentity_type: person\ncost:\n  per: record\n  amount_usd: 0.012\n");
  assert.equal(m?.cost_estimate_usd, 0.012);
});

test("fixtureSample takes the first canned response", () => {
  const s = fixtureSample(
    JSON.stringify({
      config: { known_property: "email" },
      responses: [
        { match: "POST /crm/v3/objects/contacts/search", status: 200, body: { results: [] } },
        { match: "GET /x", status: 404, body: {} },
      ],
    }),
  );
  assert.deepEqual(s, {
    config: { known_property: "email" },
    match: "POST /crm/v3/objects/contacts/search",
    status: 200,
    body: { results: [] },
  });
  assert.equal(fixtureSample("{}"), undefined);
  assert.equal(fixtureSample("nope"), undefined);
});

test("requiredConfig reads required, then the first anyOf branch", () => {
  assert.deepEqual(requiredConfig({ required: ["campaign"] }), ["campaign"]);
  assert.deepEqual(requiredConfig({ anyOf: [{ required: ["query"] }, { required: ["titles"] }] }), ["query"]);
  assert.deepEqual(requiredConfig(undefined), []);
});

test("fieldNames is null for dynamic or open schemas", () => {
  assert.equal(fieldNames("dynamic"), null);
  assert.equal(fieldNames({ dynamic: true, required: ["email"] }), null);
  assert.equal(fieldNames({ type: "object", additionalProperties: true }), null);
  assert.deepEqual(fieldNames({ properties: { a: {}, b: {} } }), ["a", "b"]);
});

const apolloSearch: Manifest = {
  id: "apollo/search",
  role: "source",
  entity_type: "person",
  config_schema: { anyOf: [{ required: ["query"] }, { required: ["titles"] }], properties: { query: {}, titles: {} } },
  credentials: ["APOLLO_API_KEY"],
};

test("usageYaml puts a source under source: and anything else under steps:", () => {
  const src = connectorFromBuiltin(apolloSearch);
  assert.equal(usageYaml(src), "source:\n  use: apollo/search\n  with:\n    query: QUERY");
  const deliver = connectorFromBuiltin({
    id: "instantly/add-to-campaign",
    role: "deliver",
    entity_type: "person",
    config_schema: { required: ["campaign"] },
  });
  assert.equal(
    usageYaml(deliver),
    "steps:\n  - id: add-to-campaign\n    use: instantly/add-to-campaign\n    with:\n      campaign: CAMPAIGN",
  );
  // Runner-injected keys are never placeholders.
  const ai = connectorFromBuiltin({
    id: "ai/filter",
    role: "filter",
    entity_type: "*",
    config_schema: { required: ["provides", "of"] },
  });
  assert.equal(usageYaml(ai), "steps:\n  - id: filter\n    use: ai/filter");
});

test("built-ins point at their binding.yaml when one is embedded", () => {
  assert.equal(connectorFromBuiltin(apolloSearch).source.label, "spec/bindings/apollo-search/binding.yaml");
  assert.equal(connectorFromBuiltin(apolloSearch).tier, "built-in");
  assert.equal(
    connectorFromBuiltin({ id: "csv/source", role: "source", entity_type: "person" }).source.label,
    "internal/adapters",
  );
});

test("registry entries keep the index description and tier, and survive a missing binding.yaml", () => {
  const entry = {
    id: "hubspot/contact-search",
    description: "Source HubSpot contacts.",
    role: "source",
    entity_type: "person",
    provides: ["email", "first_name"],
    credentials: ["HUBSPOT_ACCESS_TOKEN"],
    source,
    tier: "verified",
    since: "2026-08-30",
  };
  const withYaml = connectorFromEntry(entry, manifestFromBinding(hubspotYaml));
  assert.equal(withYaml.tier, "verified");
  assert.equal(withYaml.description, "Source HubSpot contacts.");
  assert.equal(withYaml.install, "github.com/gtme-run/gtme-bindings/hubspot-contact-search@main");
  assert.deepEqual(fieldNames(withYaml.manifest.provides), ["email", "hubspot.contact_id"]);
  const bare = connectorFromEntry({ ...entry, tier: undefined }, null);
  assert.equal(bare.tier, "community");
  assert.deepEqual(fieldNames(bare.manifest.provides), ["email", "first_name"]);
  assert.deepEqual(bare.manifest.credentials, ["HUBSPOT_ACCESS_TOKEN"]);
});

test("sortConnectors groups vendors first, then files, then steps, and byVendor keeps runs together", () => {
  const mk = (id: string, role = "enrich"): Manifest => ({ id, role, entity_type: "person" });
  const sorted = sortConnectors(
    [mk("text/compose"), mk("csv/source", "source"), mk("apollo/search", "source"), mk("hubspot/x", "source"), mk("apollo/enrich")].map(
      connectorFromBuiltin,
    ),
  );
  assert.deepEqual(
    sorted.map((c) => c.id),
    ["apollo/enrich", "apollo/search", "hubspot/x", "csv/source", "text/compose"],
  );
  assert.deepEqual(
    byVendor(sorted).map((g) => [g.vendor, g.connectors.length]),
    [
      ["apollo", 2],
      ["hubspot", 1],
      ["csv", 1],
      ["text", 1],
    ],
  );
});
