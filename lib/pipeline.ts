// The pipeline figure's data: parse a pipeline YAML block, lay it out as a
// vertical diagram, and describe it in a sentence.
//
// The figure is generated from the markdown's own YAML block, so a page
// carries one pipeline and the picture cannot drift from it. The block has
// to be a whole pipeline (`source:` with a `use:`, and `steps:` with an
// `id:` and `use:` each); a fragment gets no figure. Nothing here calls the
// CLI or the network. `gtme plan --vis` is the better long-term source and
// needs an ADR first.

import yaml from "js-yaml";

export type Role = "source" | "filter" | "enrich" | "compose" | "deliver";

export type Step = {
  id: string;
  use: string; // "apollo/enrich"
  role: Role;
  when?: string; // "fit.passed"
  cache?: string; // "30d"
  idempotency?: string; // "email"
};

export type Pipeline = {
  name?: string;
  source: Step;
  steps: Step[];
};

// The role is the adapter's, read from its verb the way its manifest would
// say it (SPEC §6). Deliver is also anything with `variables:` or
// `idempotency:`, which only a deliver step carries.
function roleOf(use: string, step: Record<string, unknown>): Role {
  if ("variables" in step || "idempotency" in step) return "deliver";
  const verb = use.slice(use.indexOf("/") + 1);
  switch (verb) {
    case "source":
    case "search":
      return "source";
    case "deliver":
    case "add-to-campaign":
      return "deliver";
    case "filter":
      return "filter";
    case "compose":
      return "compose";
    default:
      return "enrich";
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | undefined {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return undefined;
}

function toStep(raw: unknown, fallbackId?: string): Step | null {
  if (!isRecord(raw)) return null;
  const use = str(raw.use);
  const id = str(raw.id) ?? fallbackId;
  if (!use || !id || !use.includes("/")) return null;
  const s: Step = { id, use, role: roleOf(use, raw) };
  const when = str(raw.when);
  const cache = str(raw.cache);
  const idem = str(raw.idempotency);
  if (when) s.when = when;
  if (cache) s.cache = cache;
  if (idem) s.idempotency = idem;
  return s;
}

/** A whole pipeline from a YAML block, or null if the block isn't one. */
export function parsePipeline(text: string): Pipeline | null {
  let doc: unknown;
  try {
    doc = yaml.load(text);
  } catch {
    return null;
  }
  if (!isRecord(doc) || !isRecord(doc.source) || !Array.isArray(doc.steps)) {
    return null;
  }
  const source = toStep(doc.source, "source");
  if (!source) return null;
  source.role = "source";
  const steps: Step[] = [];
  for (const raw of doc.steps) {
    const s = toStep(raw);
    if (!s) return null;
    steps.push(s);
  }
  if (steps.length === 0) return null;
  const name = str(doc.name);
  return name ? { name, source, steps } : { source, steps };
}

// ---------------------------------------------------------------------------
// Layout, in SVG user units (1 = 1px at natural size).

export const FONT = 12; // node text, monospace
export const SMALL = 11; // gate labels, tags, the bus label
const CHAR = 0.62; // monospace advance as a fraction of font size
const PAD_X = 12; // box side padding
const LINE = 16; // text line height inside a box
const BOX_MIN = 150;
const BOX_MAX = 280;
const GAP = 30; // between boxes, no gate
const GAP_GATED = 58; // between boxes when the edge carries a gate
const GATE = 14; // diamond half-diagonal
const BUS_GAP = 36; // box right edge to the bus
const BUS_W = 30;
const BUS_LABEL_H = 20; // room for "ledger" under the bus
const TOP = 6;
const BOTTOM = 6;

export type Node = {
  id: string;
  use: string;
  role: Role;
  x: number;
  y: number;
  w: number;
  h: number;
  tags: string[]; // "cache: 30d", "idempotency: email"
};

export type Edge = {
  from: string;
  to: string;
  x: number; // the spine
  y1: number;
  y2: number;
  gate?: string; // the `when:` expression
  gateY?: number;
};

export type Tap = {
  id: string;
  y: number;
  x1: number; // box right edge
  x2: number; // bus left edge
  reads: boolean; // arrowhead back toward the step
};

export type Layout = {
  width: number;
  height: number;
  nodes: Node[];
  edges: Edge[];
  taps: Tap[];
  ledger: { x: number; y: number; w: number; h: number; labelY: number };
};

function textWidth(s: string, size: number) {
  return s.length * size * CHAR;
}

function tagsOf(s: Step): string[] {
  const t: string[] = [];
  if (s.cache) t.push(`cache: ${s.cache}`);
  if (s.idempotency) t.push(`idempotency: ${s.idempotency}`);
  return t;
}

// Steps that read the ledger before they work: AI steps reuse a judgment
// made with the same prompt on the same inputs (ADR-039), cached steps
// reuse a fact inside its window, and deliver steps skip an identity
// already delivered to the same target (idempotency).
function readsLedger(s: Step): boolean {
  return (
    s.role !== "source" &&
    (s.use.startsWith("ai/") || s.cache !== undefined || s.role === "deliver")
  );
}

export function layoutPipeline(p: Pipeline): Layout {
  const all = [p.source, ...p.steps];
  const boxW = Math.min(
    BOX_MAX,
    Math.max(
      BOX_MIN,
      ...all.map((s) => textWidth(s.use, FONT) + 2 * PAD_X),
      ...all.map((s) => textWidth(s.id, FONT) + 2 * PAD_X),
      ...all.flatMap((s) => tagsOf(s).map((t) => textWidth(t, SMALL) + 2 * PAD_X)),
    ),
  );
  // A gate label sits left of the spine; pad the left so it stays inside.
  const spineOffset = boxW / 2;
  const leftPad = Math.max(
    0,
    ...p.steps
      .filter((s) => s.when)
      .map((s) => textWidth(`when: ${s.when}`, SMALL) + GATE + 8 - spineOffset),
  );
  const x = Math.ceil(leftPad);

  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let y = TOP;
  let prev: Node | null = null;
  for (const s of all) {
    const tags = tagsOf(s);
    const h = 2 * LINE + (tags.length > 0 ? tags.length * (SMALL + 3) : 0) + 12;
    if (prev) {
      const gap = s.when ? GAP_GATED : GAP;
      const y1 = prev.y + prev.h;
      const y2 = y1 + gap;
      const e: Edge = { from: prev.id, to: s.id, x: x + spineOffset, y1, y2 };
      if (s.when) {
        e.gate = s.when;
        e.gateY = (y1 + y2) / 2;
      }
      edges.push(e);
      y = y2;
    }
    const n: Node = { id: s.id, use: s.use, role: s.role, x, y, w: boxW, h, tags };
    nodes.push(n);
    prev = n;
    y += h;
  }

  const busX = x + boxW + BUS_GAP;
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  const busY = first.y + first.h / 2 - 8;
  const busH = last.y + last.h / 2 + 8 - busY;
  const taps: Tap[] = nodes.map((n) => ({
    id: n.id,
    y: n.y + n.h / 2,
    x1: n.x + n.w,
    x2: busX,
    reads: readsLedger(n.id === p.source.id ? p.source : p.steps.find((s) => s.id === n.id)!),
  }));

  return {
    width: busX + BUS_W + 4,
    height: Math.max(y, busY + busH + BUS_LABEL_H) + BOTTOM,
    nodes,
    edges,
    taps,
    ledger: { x: busX, y: busY, w: BUS_W, h: busH, labelY: busY + busH + 14 },
  };
}

// ---------------------------------------------------------------------------

/** The figure in words, for the accessible name and for readers without it. */
export function describePipeline(p: Pipeline): string {
  const parts: string[] = [];
  parts.push(`source ${p.source.use}`);
  for (const s of p.steps) {
    let t = s.role === "deliver" ? `delivers with ${s.id} (${s.use})` : `${s.id} (${s.use})`;
    if (s.when) t += ` only when ${s.when}`;
    if (s.cache) t += `, cached ${s.cache}`;
    if (s.idempotency) t += `, once per ${s.idempotency}`;
    parts.push(t);
  }
  const head = p.name ? `Pipeline ${p.name}: ` : "Pipeline: ";
  return `${head}${parts.join(", then ")}. Every step writes to the ledger, and cached, AI, and deliver steps read it first.`;
}
