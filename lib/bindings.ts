// Token bindings: the same step or token named in three places on a page
// (backticks in prose, a line of the YAML, a row of a receipt, a box in the
// figure) gets the same data-step / data-token attributes, so hovering one
// lights the others. No markup: it rides the docs' rule that a thing is
// named in backticks on first mention, exactly as the YAML and the receipt
// spell it.
//
// Two levels. A step id (`reveal`) binds everything about that step. A
// token (`cache: 30d`, `fit.passed`, `apollo/enrich`) binds the exact line
// and figure element that carry it, plus its step when only one step does.

import { parsePipeline } from "./pipeline.ts";

export type Binding = { step?: string; token?: string };

export type Bindings = {
  steps: Set<string>;
  // Prose text (what sits between the backticks) -> its binding.
  inline: Map<string, Binding>;
};

export type Line = { text: string; step?: string; token?: string };

// The YAML keys whose line is a token worth binding to.
const TOKEN_KEYS = new Set(["use", "when", "cache", "idempotency"]);

// A fence, at column 0 or indented inside a list item. The body keeps the
// indentation in the source, so it is stripped by the fence's own indent.
const FENCE = /^([ \t]*)```([^\n]*)\n([\s\S]*?)^[ \t]*```[ \t]*$/gm;

function dedent(body: string, indent: string): string {
  if (!indent) return body;
  return body
    .split("\n")
    .map((l) => (l.startsWith(indent) ? l.slice(indent.length) : l.trimStart()))
    .join("\n");
}

/** Everything on a page that can be bound, read from its fenced blocks. */
export function scanBindings(markdown: string): Bindings {
  const steps = new Set<string>();
  const inline = new Map<string, Binding>();
  // A prose form that resolves to two different steps binds its token only.
  const claim = (text: string, b: Binding) => {
    const prev = inline.get(text);
    if (!prev) {
      inline.set(text, b);
    } else if (prev.step !== b.step) {
      inline.set(text, b.token ? { token: b.token } : {});
    }
  };

  for (const m of markdown.matchAll(FENCE)) {
    const lang = m[2].trim();
    const body = dedent(m[3], m[1]);
    if (lang === "yaml") {
      const p = parsePipeline(body);
      if (!p) continue;
      for (const s of [p.source, ...p.steps]) steps.add(s.id);
      for (const l of annotateYaml(body)) {
        if (!l.token || !l.step) continue;
        const b: Binding = { step: l.step, token: l.token };
        claim(l.token, b);
        claim(l.token.slice(l.token.indexOf(": ") + 2), b);
      }
    } else if (lang === "") {
      for (const id of receiptIds(body)) steps.add(id);
    }
  }
  for (const id of steps) {
    const prev = inline.get(id);
    if (!prev) inline.set(id, { step: id });
  }
  return { steps, inline };
}

/** The binding for a backticked span of prose, if it names something on the page. */
export function bindInline(text: string, b: Bindings): Binding | undefined {
  const hit = b.inline.get(text.trim());
  return hit && (hit.step || hit.token) ? hit : undefined;
}

// ---------------------------------------------------------------------------

/** Each line of a pipeline YAML block with the step it belongs to. */
export function annotateYaml(yaml: string): Line[] {
  const out: Line[] = [];
  let step: string | undefined;
  let inSteps = false;
  for (const text of yaml.split("\n")) {
    const trimmed = text.trim();
    const top = text.search(/\S/) === 0 && trimmed !== "";
    if (top) {
      // A top-level key: source: starts the source; steps: starts the list;
      // anything else (name, version) belongs to no step.
      inSteps = trimmed.startsWith("steps:");
      step = trimmed.startsWith("source:") ? "source" : undefined;
      out.push(step ? { text, step } : { text });
      continue;
    }
    const item = inSteps ? trimmed.match(/^-\s+id:\s*(\S+)/) : null;
    if (item) {
      step = item[1];
      out.push({ text, step });
      continue;
    }
    const line: Line = { text };
    // A blank line between steps belongs to neither, so a lit step ends
    // on its last key.
    if (step && trimmed !== "") line.step = step;
    const kv = trimmed.match(/^([a-z_]+):\s+(.+?)\s*$/);
    if (kv && TOKEN_KEYS.has(kv[1]) && step) line.token = `${kv[1]}: ${kv[2]}`;
    out.push(line);
  }
  return out;
}

const RECEIPT_HEADER = /^step\s+adapter\s+in\s+out\b/;

function receiptIds(body: string): string[] {
  const ids: string[] = [];
  let inTable = false;
  for (const text of body.split("\n")) {
    if (RECEIPT_HEADER.test(text)) {
      inTable = true;
      continue;
    }
    if (!inTable) continue;
    const m = text.match(/^([a-z][\w-]*)\s{2,}\S+\/\S+\s+\d/);
    if (m) ids.push(m[1]);
    else inTable = false;
  }
  return ids;
}

/**
 * Each line of a run's output with the step it is about: receipt rows, and
 * the `fit: 3 in, ...` / `send [info]: ...` progress lines. Only ids known
 * on the page bind. Null when nothing on the block binds.
 */
export function annotateOutput(text: string, steps: Set<string>): Line[] | null {
  const out: Line[] = [];
  let any = false;
  let inTable = false;
  for (const line of text.split("\n")) {
    if (RECEIPT_HEADER.test(line)) {
      inTable = true;
      out.push({ text: line });
      continue;
    }
    let id: string | undefined;
    if (inTable) {
      const m = line.match(/^([a-z][\w-]*)\s{2,}\S+\/\S+\s+\d/);
      if (m) id = m[1];
      else inTable = false;
    }
    if (!id) {
      const m = line.match(/^([a-z][\w-]*)(?::\s|\s\[)/);
      if (m) id = m[1];
    }
    if (id && steps.has(id)) {
      out.push({ text: line, step: id });
      any = true;
    } else {
      out.push({ text: line });
    }
  }
  return any ? out : null;
}
