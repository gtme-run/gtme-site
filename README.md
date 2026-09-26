# gtme-site

The website for [gtme](https://github.com/gtme-run/gtme), served at
[gtme.run](https://gtme.run).

It is a small Next.js (App Router) site with one page, the docs, two
redirects, and one raw file:

| Path        | What it is                                                           |
|-------------|----------------------------------------------------------------------|
| `/`         | What gtme is, the YAML example and its receipt, the install line      |
| `/docs/...` | The repo's `docs/` tree, fetched at request time and rendered         |
| `/start.md` | The raw `START.md`, byte for byte, via a rewrite to GitHub            |
| `/get`      | Permanent redirect (308) to `/docs/start/install`                     |
| `/start`    | Permanent redirect (308) to `/docs/start`                             |

`/start.md` never holds a copy of the markdown. It is a rewrite to
`raw.githubusercontent.com/gtme-run/gtme/main/START.md`, so editing
`START.md` in the gtme repo updates it. It's the agent's entry point and
its URL doesn't change.

`/docs` works the same way. It fetches `docs/<path>.md` and
`docs/_outline.yaml` from raw GitHub (ref `main`, or `DOCS_REF`) with a
5-minute revalidation window. The sidebar comes from `_outline.yaml`;
pages that aren't written yet show as plain text. `/docs/spec` and
`/docs/decisions` render the repo's `SPEC.md` and `DECISIONS.md`. The data
layer is `lib/docs.ts`.

A `yaml` code block that is a whole pipeline (`source:` with a `use:`,
and `steps:` with an `id:` and `use:` each) gets a figure beside it:
source at the top, one box per step, `when:` as a gate, the ledger as a
bus alongside. It is generated from the block at render time
(`lib/pipeline.ts`, `components/PipelineFigure.tsx`), so the markdown
stays as it is and GitHub and MCP readers see the block alone. A block
that doesn't parse as a whole pipeline (a fragment, or one trimmed with
`...`) gets no figure.

On the same page, a step or token named in backticks in prose, a line of
the YAML, a row of a receipt, and a box in the figure all carry the same
`data-step` and `data-token`; hovering any of them lights the others
(`lib/bindings.ts`, `components/Bindings.tsx`). There is no markup for
it: it rides the docs' rule that a thing is named in backticks exactly
as the YAML and the receipt spell it.

## Run locally

```sh
npm install
npm run dev        # http://localhost:3000
npm run build      # must pass cleanly before pushing
npm test           # the pipeline figure's parser and layout

# preview docs from a local gtme checkout instead of GitHub
DOCS_DIR=../gtme/docs npm run dev   # http://localhost:3000/docs
```

Dependencies are `next`, `react`, `react-dom`, `react-markdown`,
`remark-gfm`, `rehype-slug`, `gray-matter`, and `js-yaml`. Mermaid loads
from jsDelivr in the browser, only on pages that have a diagram. Styling is one plain stylesheet at `app/globals.css`.

## Deploy

The site deploys to Vercel from the `main` branch. The rewrite for
`/start.md` and the redirects for `/get` and `/start` live in
`next.config.ts`.

## License

[Apache-2.0](LICENSE)
