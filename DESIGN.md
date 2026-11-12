# DESIGN.md — gtme.run visual design

Status: built. Tokens live in `:root` in `app/globals.css`; fonts load in
`app/layout.tsx` through `next/font`; the header is `components/SiteHeader.tsx`,
rendered once by the root layout for every page.

## Philosophy: between monospace and modern

gtme is a CLI with a YAML protocol, and most of its readers live in a
terminal. The site should feel like it comes from that world without reading
like a terminal dump. Every type and layout choice sits somewhere on one
spectrum:

- **Monospace end:** anything a user types, runs, or reads as data. Commands,
  flags, file names, step numbers, labels, metadata, nav.
- **Modern end:** anything that explains. Paragraphs, descriptions, captions.
- **The bridge:** headings. They carry the character of a monospace face
  with the readability of a proportional one.

The rule of thumb: the more a piece of text behaves like input or output, the
more monospace it gets. The more it behaves like an explanation, the more
modern it gets.

## Type

Three faces, each with one job.

| Role | Face | Where |
| --- | --- | --- |
| Display | Space Grotesk (500–700) | h1–h3, card titles, the wordmark |
| Body | Inter (400–500) | paragraphs, descriptions, table text |
| Mono | JetBrains Mono (400–700) | code, commands, labels, eyebrows, step numbers, nav, metadata |

Space Grotesk descends from Space Mono, so the display face is literally a
monospace face made proportional. That lineage is the philosophy in one font.

Rules:

- Space Grotesk only at 18px and above. Its distinctive letters (`y`, `t`,
  `a`) help at display sizes and hurt at reading sizes.
- Body copy is always Inter. Docs pages are long; reading comfort wins.
- Mono is a real voice in the layout, not only inside code blocks. Use it for
  small uppercase eyebrows above headings, nav items, step numbers, and
  metadata lines. This is where the "between" becomes visible.
- Tight tracking on display headings (about `-0.02em`), default tracking on
  body, slight positive tracking (about `0.04em`) on uppercase mono labels.
- Load fonts with `next/font` so they self-host and do not shift layout.

## Color

- **Page background:** cool light gray (around `#f3f4f6`), not pure white.
- **Surfaces:** white cards on the gray page. Structure comes from the
  surface change, not from borders.
- **Text:** near-black slate for headings (around `#1f2937`), a lighter slate
  for secondary text (around `#4b5563`).
- **Accent: builder blue.** The brand color is `#2b45c4`, named builder
  blue. Its dark-mode shade is `#8ea0ff`, builder blue light. Both live in
  the `--builder-blue` token, and `--accent` points at it. It marks links,
  step markers, eyebrows, the current nav item, and the one phrase in the
  home page title that names where gtme runs ("Claude Code"). It replaced
  the earlier green.
- **Dark mode:** keep the same structure. Dark page, slightly lighter cards,
  and the accent lifted for contrast. Every token in `:root` gets a dark
  counterpart.

## Components

- **Cards:** white, rounded (about 12px), a very soft shadow or none, generous
  padding. Title in Space Grotesk, description in Inter below it.
- **Numbered steps:** a filled accent circle with the number in mono, joined
  by a thin vertical rule between cards. Use for guide procedures and any
  ordered sequence.
- **Before and after:** dashed-border boxes with muted text show the weak
  pattern ("what most teams do"). Solid white cards show the strong one. Use
  on the homepage and concept pages, sparingly in guides.
- **Flow arrows:** thin gray arrows between boxes for linear pipelines.
- **Code blocks:** mono on a slightly tinted surface, no heavy chrome.
- **Header:** one component for the whole site, sticky, the same width on
  every page so the nav never shifts. Brand in Space Grotesk, nav items in
  mono, the current section marked with a white pill.
- **One site width:** the `--shell` token (80rem). The header, footer, home
  page, docs layout, and connectors all share its edges, so `/gtme` lines up
  with the content's left edge and the last nav link with its right edge.
  Inside a wide card, prose stays capped at 70ch; code, tables, and figures
  may use the full width.
- **Footer mark:** `gtme.run` in Space Grotesk, bold, right-aligned.
- **Eyebrows:** the section name in small uppercase mono above a page title.

## Restraint

- Docs pages stay quiet. The before-and-after device and large emphasis
  headings belong on the homepage and concept pages, not every guide.
- One accent color. No gradients, no decorative illustration.
- Whitespace and the gray/white surface change do the layout work.

## Decisions

- **Accent color:** builder blue (`#2b45c4`), a shade deeper than the default
  UI blue. Named 2026-11-12.
- **Mono face:** JetBrains Mono. It reads better than Space Mono in long code
  blocks and in the run tables, which are the site's main exhibit.

## Open questions

- **Distinctiveness.** Space Grotesk is a common choice right now. The mono
  layer is what makes this system its own; if that is not enough, Martian
  Grotesk with Martian Mono, or IBM Plex Sans with Plex Mono, keep the same
  idea as a matched family.
