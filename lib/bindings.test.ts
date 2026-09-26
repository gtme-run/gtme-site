import { test } from "node:test";
import assert from "node:assert/strict";
import { scanBindings, annotateYaml, annotateOutput, bindInline } from "./bindings.ts";

const page = `
# See it run

\`\`\`sh
gtme run demo.yaml --simulate
\`\`\`

\`\`\`
run 01M (demo)
fit: 1 in, 1 out, 0 cached, 0 filtered, 0 failed
step    adapter                    in  out  empty  cached  filtered  failed  cost     avoided
source  apollo/search              0   1    -      0       -         -       $0       -
fit     ai/filter                  1   1    -      0       -         -       $0       -
reveal  apollo/enrich              1   1    -      0       -         -       $0.0100  -
send    instantly/add-to-campaign  1   0    -      0       -         -       $0       -
send: resolved variables for 1 record(s)
total: $0.0100 (estimated) spent
\`\`\`

\`\`\`yaml
name: demo
version: 1

source:
  use: apollo/search
  with:
    limit: 1

steps:
  - id: fit
    use: ai/filter
    uses: [title, company_name]

  - id: reveal
    use: apollo/enrich
    when: fit.passed
    cache: 30d

  - id: send
    use: instantly/add-to-campaign
    with: { campaign: "Q3 VP Marketing" }
    idempotency: email
\`\`\`

\`\`\`
step    adapter      in  out  empty  cached  filtered  failed  cost     avoided
source  csv/source   0   3    -      0       -         -       $0       -
score   demo/enrich  3   3    -      0       -         -       $0.0300  -
out     csv/deliver  1   1    -      0       -         -       $0       -
\`\`\`
`;

test("scanBindings collects step ids from pipelines and receipts, and tokens from the yaml", () => {
  const b = scanBindings(page);
  assert.deepEqual(
    [...b.steps].sort(),
    ["fit", "out", "reveal", "score", "send", "source"],
  );
  // Prose forms map to a step, a canonical token, or both.
  assert.deepEqual(b.inline.get("fit"), { step: "fit" });
  assert.deepEqual(b.inline.get("cache: 30d"), { step: "reveal", token: "cache: 30d" });
  assert.deepEqual(b.inline.get("30d"), { step: "reveal", token: "cache: 30d" });
  assert.deepEqual(b.inline.get("idempotency: email"), { step: "send", token: "idempotency: email" });
  assert.deepEqual(b.inline.get("apollo/enrich"), { step: "reveal", token: "use: apollo/enrich" });
  assert.deepEqual(b.inline.get("when: fit.passed"), { step: "reveal", token: "when: fit.passed" });
  assert.deepEqual(b.inline.get("fit.passed"), { step: "reveal", token: "when: fit.passed" });
  assert.equal(b.inline.get("limit: 1"), undefined);
  assert.equal(b.inline.get("cached"), undefined);
});

test("fences indented inside a list item are scanned too", () => {
  const b = scanBindings(`
1. Run it:

    \`\`\`sh
    gtme run cache.yaml
    \`\`\`

    \`\`\`
    run 01M (cache)
    step    adapter      in  out  empty  cached
    source  csv/source   0   3    -      0
    score   demo/enrich  3   3    -      0
    \`\`\`
`);
  assert.deepEqual([...b.steps].sort(), ["score", "source"]);
});

test("a value shared by two steps binds the token but not a step", () => {
  const b = scanBindings(`
\`\`\`yaml
source:
  use: csv/source
steps:
  - id: reveal
    use: apollo/enrich
    when: fit.passed
  - id: lines
    use: ai/compose
    when: fit.passed
\`\`\`
`);
  assert.deepEqual(b.inline.get("fit.passed"), { token: "when: fit.passed" });
  assert.deepEqual(b.inline.get("when: fit.passed"), { token: "when: fit.passed" });
});

test("annotateYaml gives each line its step and, for the binding keys, its token", () => {
  const yaml = `name: demo

source:
  use: apollo/search
  with:
    limit: 1

steps:
  - id: fit
    use: ai/filter

  - id: reveal
    use: apollo/enrich
    when: fit.passed
    cache: 30d
`;
  const lines = annotateYaml(yaml);
  const by = Object.fromEntries(lines.map((l) => [l.text.trim(), l]));
  assert.equal(by["name: demo"].step, undefined);
  assert.equal(by["source:"].step, "source");
  assert.deepEqual(by["use: apollo/search"], { text: "  use: apollo/search", step: "source", token: "use: apollo/search" });
  assert.equal(by["limit: 1"].step, "source");
  assert.equal(by["limit: 1"].token, undefined);
  assert.equal(by["steps:"].step, undefined);
  assert.deepEqual(by["- id: fit"], { text: "  - id: fit", step: "fit" });
  assert.equal(by["use: ai/filter"].step, "fit");
  assert.equal(by["- id: reveal"].step, "reveal");
  assert.deepEqual(by["when: fit.passed"], { text: "    when: fit.passed", step: "reveal", token: "when: fit.passed" });
  assert.deepEqual(by["cache: 30d"], { text: "    cache: 30d", step: "reveal", token: "cache: 30d" });
  // Blank lines belong to no step; the count of lines is preserved.
  assert.equal(lines[lines.length - 2].text, "    cache: 30d");
  assert.deepEqual(lines[10], { text: "" });
  assert.equal(lines.length, yaml.split("\n").length);
});

test("annotateOutput binds receipt rows and progress lines to their step, by known ids only", () => {
  const out = `run 01M (demo)
fit: 1 in, 1 out, 0 cached
send [info]: instantly: added 2 leads
step    adapter        in  out
source  apollo/search  0   1
fit     ai/filter      1   1
total: $0.0100 (estimated) spent
send: resolved variables for 1 record(s)
`;
  const steps = new Set(["source", "fit", "send"]);
  const lines = annotateOutput(out, steps)!;
  assert.deepEqual(
    lines.map((l) => l.step ?? null),
    [null, "fit", "send", null, "source", "fit", null, "send", null],
  );
  // Nothing bindable means the block is left alone.
  assert.equal(annotateOutput("hello\nworld\n", steps), null);
  // The header line never binds, even though "step" could be an id elsewhere.
  assert.equal(annotateOutput("step adapter in out\n", new Set(["step"]))?.[0].step, undefined);
});

test("bindInline maps a backticked span to its step and token, or nothing", () => {
  const b = scanBindings(page);
  assert.deepEqual(bindInline("reveal", b), { step: "reveal" });
  assert.deepEqual(bindInline("`cache: 30d`", b), undefined); // backticks are not part of the text
  assert.deepEqual(bindInline("cache: 30d", b), { step: "reveal", token: "cache: 30d" });
  assert.equal(bindInline("gtme show", b), undefined);
  assert.equal(bindInline("$0.0100", b), undefined);
});
