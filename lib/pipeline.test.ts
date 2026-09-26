import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePipeline, layoutPipeline, describePipeline } from "./pipeline.ts";

const demo = `
name: demo
version: 1

source:
  use: apollo/search
  with:
    query: vp marketing, saas
    limit: 1

steps:
  - id: fit
    use: ai/filter
    uses: [title, company_name]
    with:
      template: >
        Keep only people who plausibly own outbound tooling decisions.

  - id: reveal
    use: apollo/enrich
    when: fit.passed
    cache: 30d

  - id: send
    use: instantly/add-to-campaign
    with: { campaign: "Q3 VP Marketing" }
    variables:
      first_name: first_name
    idempotency: email
`;

test("parses a pipeline into source, steps, and their roles", () => {
  const p = parsePipeline(demo);
  assert.ok(p);
  assert.equal(p.name, "demo");
  assert.deepEqual(p.source, { id: "source", use: "apollo/search", role: "source" });
  assert.deepEqual(
    p.steps.map((s) => [s.id, s.use, s.role]),
    [
      ["fit", "ai/filter", "filter"],
      ["reveal", "apollo/enrich", "enrich"],
      ["send", "instantly/add-to-campaign", "deliver"],
    ],
  );
  assert.equal(p.steps[1].when, "fit.passed");
  assert.equal(p.steps[1].cache, "30d");
  assert.equal(p.steps[2].idempotency, "email");
  assert.equal(p.steps[0].when, undefined);
});

test("a step with variables or idempotency is a deliver step whatever its verb", () => {
  const p = parsePipeline(`
source:
  use: csv/source
steps:
  - id: out
    use: acme/push
    variables:
      first_line: first_line
`);
  assert.equal(p?.steps[0].role, "deliver");
});

test("a block that is not a whole pipeline gets no figure", () => {
  assert.equal(parsePipeline("    limit: 5"), null);
  assert.equal(parsePipeline("uses: [a, b]\nwith:\n  template: x"), null);
  assert.equal(parsePipeline("source:\n  use: csv/source\n"), null); // no steps
  assert.equal(parsePipeline("steps:\n  - id: a\n    use: x/y\n"), null); // no source
  assert.equal(parsePipeline("source: {use: csv/source}\nsteps: []"), null);
  assert.equal(parsePipeline("source: {use: csv/source}\nsteps:\n  - id: a\n"), null); // step without use
  assert.equal(parsePipeline("name: demo\n...\nsteps:\n  - id: a\n"), null); // trimmed with ...
  assert.equal(parsePipeline("not: [valid"), null);
});

test("layout stacks source, steps, and gates top to bottom with the ledger alongside", () => {
  const p = parsePipeline(demo)!;
  const l = layoutPipeline(p);
  assert.deepEqual(
    l.nodes.map((n) => n.id),
    ["source", "fit", "reveal", "send"],
  );
  for (let i = 1; i < l.nodes.length; i++) {
    assert.ok(l.nodes[i].y > l.nodes[i - 1].y + l.nodes[i - 1].h, `${l.nodes[i].id} is below`);
  }
  // One edge per hop; the hop into `reveal` carries its gate.
  assert.equal(l.edges.length, 3);
  assert.deepEqual(
    l.edges.map((e) => e.gate),
    [undefined, "fit.passed", undefined],
  );
  const gated = l.edges[1];
  assert.ok(gated.gateY! > l.nodes[1].y + l.nodes[1].h && gated.gateY! < l.nodes[2].y);
  // The bus sits to the right of every node and spans them all.
  assert.ok(l.ledger.x >= Math.max(...l.nodes.map((n) => n.x + n.w)));
  assert.ok(l.ledger.y <= l.nodes[0].y + l.nodes[0].h / 2);
  assert.ok(l.ledger.y + l.ledger.h >= l.nodes[3].y + l.nodes[3].h / 2);
  // Every node has a bus tap; readers get one back.
  assert.deepEqual(
    l.taps.map((t) => [t.id, t.reads]),
    [
      ["source", false],
      ["fit", true], // ai/* reuses judgments
      ["reveal", true], // cache: 30d
      ["send", true], // idempotency
    ],
  );
  assert.ok(l.width > l.ledger.x + l.ledger.w);
  assert.ok(l.height > l.nodes[3].y + l.nodes[3].h);
});

test("a long adapter id widens the boxes and a long gate label pads the left", () => {
  const p = parsePipeline(`
source: {use: csv/source}
steps:
  - id: icp-filter
    use: ai/filter
  - id: send
    use: instantly/add-to-campaign
    when: icp-filter.passed
`)!;
  const l = layoutPipeline(p);
  const node = l.nodes[2];
  assert.ok(node.w >= 25 * 7 + 16, "box fits instantly/add-to-campaign");
  assert.ok(l.nodes[0].x > 0, "left padding for the gate label");
  assert.equal(l.nodes[0].x, l.nodes[2].x, "all boxes share one column");
});

test("describes the figure in one sentence per node for readers without the picture", () => {
  const p = parsePipeline(demo)!;
  const s = describePipeline(p);
  assert.match(s, /^Pipeline demo: /);
  assert.match(s, /source apollo\/search/);
  assert.match(s, /reveal \(apollo\/enrich\) only when fit\.passed, cached 30d/);
  assert.match(s, /delivers with send \(instantly\/add-to-campaign\), once per email/);
  assert.match(s, /ledger/);
});
