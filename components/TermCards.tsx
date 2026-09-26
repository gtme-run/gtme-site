"use client";

import { useEffect } from "react";

// Glossary hover cards. Every term the page names in code font, or links
// to the page that owns it, carries data-term, data-def, data-page and
// data-page-label (components/DocsMarkdown). Pointing at one, or tabbing
// to it, shows one card for the page with the definition and a link to
// the owner page; the card stays while the pointer is on it, so the link
// can be followed. One delegated listener per page; nothing is rendered.

const ROOT = ".docs-page";
const SEL = "[data-term]";
const HEADING = "h1, h2, h3, h4, h5, h6";
const GAP = 6;
const EDGE = 8;
const CLOSE_MS = 160;

function build(): { card: HTMLElement; def: HTMLElement; link: HTMLAnchorElement } {
  const card = document.createElement("div");
  card.className = "term-card";
  card.id = "term-card";
  card.setAttribute("role", "tooltip");
  card.hidden = true;
  const def = document.createElement("p");
  const link = document.createElement("a");
  card.append(def, link);
  document.body.append(card);
  return { card, def, link };
}

export default function TermCards() {
  useEffect(() => {
    const root = document.querySelector(ROOT);
    if (!root || !root.querySelector(SEL)) return;
    const { card, def, link } = build();
    let on: HTMLElement | null = null;
    let timer = 0;

    const place = () => {
      if (!on) return;
      const r = on.getBoundingClientRect();
      const w = card.offsetWidth;
      const h = card.offsetHeight;
      const left = Math.max(EDGE, Math.min(r.left, window.innerWidth - w - EDGE));
      let top = r.bottom + GAP;
      if (top + h > window.innerHeight - EDGE && r.top - h - GAP >= EDGE) top = r.top - h - GAP;
      card.style.left = `${Math.round(left)}px`;
      card.style.top = `${Math.round(top)}px`;
    };

    const hide = () => {
      window.clearTimeout(timer);
      timer = 0;
      if (!on) return;
      on.removeAttribute("aria-describedby");
      on = null;
      card.hidden = true;
    };

    const show = (el: HTMLElement) => {
      window.clearTimeout(timer);
      timer = 0;
      if (el === on) return;
      if (on) on.removeAttribute("aria-describedby");
      on = el;
      def.textContent = el.dataset.def ?? "";
      link.href = el.dataset.page ?? "#";
      link.textContent = `${el.dataset.pageLabel ?? "Read more"} →`;
      el.setAttribute("aria-describedby", card.id);
      card.hidden = false;
      place();
    };

    const later = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(hide, CLOSE_MS);
    };

    // The term under the pointer or focus, if it is one that gets a card.
    const termAt = (ev: Event): HTMLElement | null => {
      const el = (ev.target as Element | null)?.closest?.(SEL) as HTMLElement | null;
      if (!el || el.closest(HEADING)) return null;
      return el;
    };

    const enter = (ev: Event) => {
      const el = termAt(ev);
      if (el) show(el);
      else if (on && !card.contains(ev.target as Node)) later();
    };
    const leave = (ev: Event) => {
      const to = (ev as MouseEvent | FocusEvent).relatedTarget as Node | null;
      if (to && (card.contains(to) || (on && on.contains(to)))) return;
      later();
    };
    const keep = () => window.clearTimeout(timer);
    const key = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") hide();
    };

    root.addEventListener("mouseover", enter);
    root.addEventListener("mouseout", leave);
    root.addEventListener("focusin", enter);
    root.addEventListener("focusout", leave);
    card.addEventListener("mouseenter", keep);
    card.addEventListener("mouseleave", later);
    card.addEventListener("focusin", keep);
    card.addEventListener("focusout", leave);
    document.addEventListener("keydown", key);
    window.addEventListener("scroll", place, { passive: true });
    window.addEventListener("resize", place);
    return () => {
      hide();
      root.removeEventListener("mouseover", enter);
      root.removeEventListener("mouseout", leave);
      root.removeEventListener("focusin", enter);
      root.removeEventListener("focusout", leave);
      document.removeEventListener("keydown", key);
      window.removeEventListener("scroll", place);
      window.removeEventListener("resize", place);
      card.remove();
    };
  }, []);
  return null;
}
