"use client";

import { useEffect } from "react";

// Hover binding for the page: pointing at anything with data-step lights
// every element on the page about that step (its backticks in prose, its
// YAML lines, its receipt rows, its box and taps in the figure). Anything
// with data-token also lights the exact matches for that token, stronger.
// One delegated listener per page; nothing is rendered.

const ROOT = ".docs-page";
const SEL = "[data-step], [data-token]";

function lit(root: Element, on: Element | null) {
  for (const el of root.querySelectorAll(".lit, .lit-token")) {
    el.classList.remove("lit", "lit-token");
  }
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

export default function Bindings() {
  useEffect(() => {
    const root = document.querySelector(ROOT);
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
  }, []);
  return null;
}
