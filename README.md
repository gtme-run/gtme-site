# gtme-site

The website for [gtme](https://github.com/gtme-run/gtme), served at
[gtme.run](https://gtme.run).

It is a small Next.js (App Router) site with a few pages and one raw file:

| Path        | What it is                                                        |
|-------------|-------------------------------------------------------------------|
| `/`         | The pitch, the YAML example and receipt, the install line          |
| `/get`      | Install instructions: Homebrew, release tarball, build from source |
| `/start`    | The repo's `START.md`, fetched at request time and rendered        |
| `/start.md` | The raw `START.md`, byte for byte, via a rewrite to GitHub         |
| `/docs/...` | The repo's `docs/` tree, fetched at request time and rendered      |

`/start` and `/start.md` never hold a copy of the markdown. `/start.md` is a
rewrite to `raw.githubusercontent.com/gtme-run/gtme/main/START.md`;
`/start` fetches the same URL server-side with a 5-minute revalidation
window and renders it with `react-markdown` + `remark-gfm`. Editing
`START.md` in the gtme repo updates both.

`/docs` works the same way. It fetches `docs/<path>.md` and
`docs/_outline.yaml` from raw GitHub (ref `main`, or `DOCS_REF`) with a
5-minute revalidation window. The sidebar comes from `_outline.yaml`;
pages that aren't written yet show as plain text. `/docs/spec` and
`/docs/decisions` render the repo's `SPEC.md` and `DECISIONS.md`. The data
layer is `lib/docs.ts`.

## Run locally

```sh
npm install
npm run dev        # http://localhost:3000
npm run build      # must pass cleanly before pushing

# preview docs from a local gtme checkout instead of GitHub
DOCS_DIR=../gtme/docs npm run dev   # http://localhost:3000/docs
```

Dependencies are `next`, `react`, `react-dom`, `react-markdown`,
`remark-gfm`, `rehype-slug`, `gray-matter`, and `js-yaml`. Mermaid loads
from jsDelivr in the browser, only on pages that have a diagram. Styling is one plain stylesheet at `app/globals.css`.

## Deploy

The site deploys to Vercel from the `main` branch. The rewrite for
`/start.md` lives in `next.config.ts`.

## License

[Apache-2.0](LICENSE)
