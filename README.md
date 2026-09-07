# gtme-site

The website for [gtme](https://github.com/gtme-run/gtme), served at
[gtme.run](https://gtme.run).

It is a small Next.js (App Router) site with three pages and one raw file:

| Path        | What it is                                                        |
|-------------|-------------------------------------------------------------------|
| `/`         | The pitch, the YAML example and receipt, the install line          |
| `/get`      | Install instructions: Homebrew, release tarball, build from source |
| `/start`    | The repo's `START.md`, fetched at request time and rendered        |
| `/start.md` | The raw `START.md`, byte for byte, via a rewrite to GitHub         |

`/start` and `/start.md` never hold a copy of the markdown. `/start.md` is a
rewrite to `raw.githubusercontent.com/gtme-run/gtme/main/START.md`;
`/start` fetches the same URL server-side with a 5-minute revalidation
window and renders it with `react-markdown` + `remark-gfm`. Editing
`START.md` in the gtme repo updates both.

## Run locally

```sh
npm install
npm run dev        # http://localhost:3000
npm run build      # must pass cleanly before pushing
```

Dependencies are `next`, `react`, `react-dom`, `react-markdown`, and
`remark-gfm`. Styling is one plain stylesheet at `app/globals.css`.

## Deploy

The site deploys to Vercel from the `main` branch. The rewrite for
`/start.md` lives in `next.config.ts`.

## License

[Apache-2.0](LICENSE)
