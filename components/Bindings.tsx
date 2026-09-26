"use client";

import { useEffect } from "react";

// Hover binding for the page: pointing at anything with data-step lights
// every element on the page about that step (its backticks in prose, its
// YAML lines, its receipt rows, its box and taps in the figure). Anything
// with data-token also lights the exact matches for that token, stronger.
// One delegated listener per page; nothing is rendered.
//
// With `follow`, on a page whose pipeline sits in a sticky rail, the step
// most recently named in the prose (the last backticked step above the
// upper part of the viewport) stays lit in the rail as the reader
// scrolls, and the rail scrolls its YAML to that step.

const ROOT = ".docs-page";
const SEL = "[data-step], [data-token]";
const RAIL_MEDIA = "(min-width: 90rem)";

function unlit(root: Element, cls: string) {
  for (const el of root.querySelectorAll(`.${cls}`)) el.classList.remove(cls);
}

function lit(root: Element, on: Element | null) {
  unlit(root, "lit");
  unlit(root, "lit-token");
  if (!on) return;
  const step = on.getAttribute("data-step");
  const token = on.getAttribute("data-token");
  if (step) {
    for (const el of root.querySelectorAll(`[data-step="${CSS.escape(step)}"]`)) {
      el.classList.add("lit");
    }
  }
  if (token) {
    for (const el of root.querySelectorAll(`[data-token="${CSS.escape(token)}"]`)) {
      el.classList.add("lit", "lit-token");
    }
  }
}

function useHover(root: Element | null) {
  useEffect(() => {
    if (!root) return;
    let current: Element | null = null;
    const over = (ev: Event) => {
      const el = (ev.target as Element | null)?.closest?.(SEL) ?? null;
      if (el === current) return;
      current = el;
      lit(root, el);
    };
    const out = (ev: Event) => {
      const to = (ev as MouseEvent).relatedTarget as Element | null;
      if (to && root.contains(to) && to.closest(SEL) === current) return;
      current = null;
      lit(root, null);
    };
    root.addEventListener("mouseover", over);
    root.addEventListener("mouseout", out);
    root.addEventListener("focusin", over);
    root.addEventListener("focusout", out);
    return () => {
      root.removeEventListener("mouseover", over);
      root.removeEventListener("mouseout", out);
      root.removeEventListener("focusin", over);
      root.removeEventListener("focusout", out);
    };
  }, [root]);
}

function useFollow(root: Element | null, enabled: boolean) {
  useEffect(() => {
    if (!root || !enabled) return;
    const rail = root.querySelector(".docs-rail");
    if (!rail) return;
    const mq = window.matchMedia(RAIL_MEDIA);
    let step: string | null = null;
    let raf = 0;

    const apply = () => {
      unlit(rail, "follow");
      if (!step) return;
      const sel = `[data-step="${CSS.escape(step)}"]`;
      for (const el of rail.querySelectorAll(sel)) el.classList.add("follow");
      // Bring the step's first YAML line into the rail's own scroll.
      const line = rail.querySelector<HTMLElement>(`.ln${sel}`);
      if (line) {
        const top = line.getBoundingClientRect().top - rail.getBoundingClientRect().top;
        rail.scrollTo({ top: rail.scrollTop + top - rail.clientHeight * 0.3, behavior: "smooth" });
      }
    };

    const update = () => {
      raf = 0;
      if (!mq.matches) {
        if (step !== null) {
          step = null;
          unlit(rail, "follow");
        }
        return;
      }
      // The last backticked step above 40% of the viewport is the one the
      // reader is on. Prose only: a receipt names every step at once.
      const line = window.innerHeight * 0.4;
      let cur: string | null = null;
      for (const el of root.querySelectorAll<HTMLElement>(".docs-body code[data-step]")) {
        if (el.getBoundingClientRect().top > line) break;
        cur = el.dataset.step ?? null;
      }
      if (cur === step) return;
      step = cur;
      apply();
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (raf) cancelAnimationFrame(raf);
      unlit(rail, "follow");
    };
  }, [root, enabled]);
}

export default function Bindings({ follow = false }: { follow?: boolean }) {
  const root = typeof document === "undefined" ? null : document.querySelector(ROOT);
  useHover(root);
  useFollow(root, follow);
  return null;
}
