import type { Metadata } from "next";
import Link from "next/link";
import RepoPill from "@/components/RepoPill";
import { getSite, type NavCollection, type NavPage, type Site } from "@/lib/docs";

// The start paths and collections come from the gtme repo's docs/ at
// request time, so the home page can't point at a page that isn't there.
export const revalidate = 300;

export const metadata: Metadata = {
  title: { absolute: "/gtme: GTM pipelines in Claude Code" },
  description:
    "gtme is a CLI and a Claude Code plugin for GTM pipelines. Describe a campaign, Claude writes it as YAML, and gtme runs it against your vendors with a ledger that never pays or sends twice.",
};

const PIPELINE = `name: apollo-to-instantly
version: 1

source:
  use: apollo/search
  with:
    query: "saas"
    titles: ["vp marketing", "head of marketing"]
    employee_ranges: ["50,200"]
    limit: 5

steps:
  - id: icp-filter
    use: ai/filter
    uses: [first_name, title, company_name]
    with:
      template: >
        Keep only contacts likely to own outbound tooling decisions.
      batch_size: 25

  ...

  - id: personalize
    use: ai/compose
    when: icp-filter.passed
    uses: [recent_posts, role_history]
    with:
      template: >
        Write first_line and ps_line using recent_posts and role_history.
        first_line references something specific and recent; ps_line is one
        short, low-pressure sentence. No flattery, no exclamation marks.
      batch_size: 25

  - id: send
    use: instantly/add-to-campaign
    with:
      campaign: 0198a0b1-2c3d-4e5f-8a9b-0c1d2e3f4a5b   # the campaign id
    variables:
      first_line: first_line
      ps_line: ps_line
    idempotency: email`;

const DRY_RUN = `run 01M3D1ZTKBQBS57C9WPK8NQM60 — done (dry run — nothing sent)
step         adapter                    in  out  empty  cached  filtered  failed  cost     avoided
source       apollo/search              0   5    -      0       -         -       $0       -
icp-filter   ai/filter                  5   5    -      0       -         -       $0.0105  -
reveal       apollo/enrich              5   5    -      0       -         -       $0.0500  -
linkedin     harvest/profile            5   5    -      0       -         -       $0.0600  -
personalize  ai/compose                 5   5    -      0       -         -       $0.0232  -
send         instantly/add-to-campaign  5   0    -      0       -         -       $0       -
send: preflight ok — campaign "Q3 VP Marketing" (0198a0b1-2c3d-4e5f-8a9b-0c1d2e3f4a5b) — 3 check(s) (✓ campaign active, ✓ variable first_line referenced, ✓ variable ps_line referenced)
total: $0.1437 (estimated) spent`;

const RE_RUN = `step         adapter                    in  out  empty  cached  filtered  failed  cost  avoided
source       apollo/search              0   5    -      0       -         -       $0    -
icp-filter   ai/filter                  5   0    -      5       -         -       $0    ?
reveal       apollo/enrich              5   0    -      5       -         -       $0    $0.0500
linkedin     harvest/profile            5   0    -      5       -         -       $0    $0.0600
personalize  ai/compose                 5   0    -      5       -         -       $0    ?
send         instantly/add-to-campaign  5   0    -      0       -         -       $0    -
send: 5 already delivered
total: $0 (estimated) spent, $0.1100+? avoided via cache (20 records skipped)`;

const DOES = [
  {
    title: "One prompt, a live run",
    prompt: "Run prospects.yaml.",
    text: "Describe the campaign in your own words. Claude writes the pipeline, rehearses it for $0, and dry-runs it while the console shows each step.",
  },
  {
    title: "Never pay twice",
    prompt: "Run it again.",
    text: "The ledger keeps every fact a vendor returned. A re-run reads them back instead of buying them again, and a record already delivered is never delivered again.",
  },
  {
    title: "Nothing sends without you",
    prompt: "Sync the prospects to the CRM with crm.yaml.",
    text: "Every run climbs the same ladder: plan, simulate, dry-run, armed. The armed run is the only one that spends and sends, and starting it is always your call.",
  },
];

// A prompt as typed in Claude Code: the chevron, then the words.
function Prompt({ text, small }: { text: string; small?: boolean }) {
  return (
    <p className={small ? "prompt prompt-small" : "prompt"}>
      <span className="prompt-mark" aria-hidden="true">
        ❯
      </span>
      <span className="visually-hidden">You type: </span>
      <span>{text}</span>
    </p>
  );
}

function routeOf(to: string) {
  return to.replace(/^\/+|\/+$/g, "");
}

type Gate = { href: string; label: string; text: string };

// The start paths, in the order and words of start/index.md's links.
function startGates(site: Site): Gate[] {
  const start = site.collections.find((c) => c.key === "start");
  const links = start?.doc?.data.links ?? [];
  const out: Gate[] = [];
  for (const l of links) {
    if (typeof l?.to !== "string") continue;
    const route = routeOf(l.to);
    // Install is the hero's first step, so the gates are only the starts.
    if (!route.startsWith("start/") || route === "start/install") continue;
    const entry = site.byRoute.get(route) as NavPage | undefined;
    if (!entry?.doc) continue;
    out.push({ href: `/docs/${route}`, label: entry.label, text: l.description ?? entry.doc.data.description ?? "" });
  }
  return out;
}

function exploreGates(site: Site): Gate[] {
  const out: Gate[] = site.collections
    .filter((c: NavCollection) => c.key !== "start" && c.doc)
    .map((c) => ({ href: `/docs/${c.route}`, label: c.label, text: c.doc!.data.description ?? "" }));
  out.push({
    href: "/registry",
    label: "Connectors",
    text: "Every vendor, file, and step gtme can run, each page generated from the adapter itself.",
  });
  return out;
}

function GateGrid({ gates, numbered }: { gates: Gate[]; numbered?: boolean }) {
  return (
    <ul className={numbered ? "gates gates-numbered" : "gates"}>
      {gates.map((g, i) => (
        <li key={g.href}>
          <Link href={g.href} className="gate">
            {numbered ? <span className="gate-n">{i + 1}</span> : null}
            <span className="gate-title">{g.label}</span>
            <span className="gate-text">{g.text}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function HomePage() {
  const site = await getSite();
  const starts = site ? startGates(site) : [];
  const explore = site ? exploreGates(site) : [];

  return (
    <div className="home">
      <section className="home-hero">
        <div className="home-hero-text">
          <p className="eyebrow">GTM orchestration for Claude Code</p>
          <h1>
            Run outbound campaigns from <span className="builder-blue">Claude Code</span>
          </h1>
          <p className="lede">
            <span className="slash">/gtme</span> is a CLI and a Claude Code plugin. You describe a campaign in your
            own words, Claude writes it as a small YAML pipeline, and <span className="slash">/gtme</span> runs it
            against your vendors. An append-only ledger remembers every fact,
            so a re-run pays only for what&apos;s new and nobody gets the same message twice.
          </p>
          <RepoPill />
        </div>

        <div className="home-install">
          <p className="eyebrow muted-eyebrow">Get started in three steps</p>
          <ol className="steps">
            <li>
              <strong>Install the binary.</strong>
              <pre>
                <code>brew install gtme-run/tap/gtme</code>
              </pre>
            </li>
            <li>
              <strong>Add the plugin in Claude Code.</strong>
              <pre>
                <code>{`/plugin marketplace add gtme-run/gtme\n/plugin install gtme@gtme-run`}</code>
              </pre>
            </li>
            <li>
              <strong>
                Type <code>/gtme</code>.
              </strong>{" "}
              The console opens beside the chat. Ask for a campaign, or start with{" "}
              <Link href="/docs/start/show-me">See it run</Link>, which needs no keys and spends nothing.
            </li>
          </ol>
        </div>
      </section>

      <figure className="home-video">
        <video
          src="/gtme-console-demo-v3.mp4"
          poster="/gtme-console-demo-v3.jpg"
          controls
          muted
          playsInline
          preload="metadata"
          width={1920}
          height={1152}
        >
          <a href="/gtme-console-demo-v3.mp4">Watch the demo (MP4, 42 seconds)</a>
        </video>
        <figcaption>
          Forty-two seconds in Claude Code: one prompt runs a pipeline, the re-run pays nothing, and the send waits
          for your yes.
        </figcaption>
      </figure>

      <section className="home-section" aria-labelledby="does">
        <p className="eyebrow">What it does</p>
        <h2 id="does">A campaign is a file you can run again</h2>
        <ol className="feature-cards">
          {DOES.map((d) => (
            <li key={d.title}>
              <Prompt text={d.prompt} small />
              <h3>{d.title}</h3>
              <p>{d.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="home-section home-proof" aria-labelledby="proof">
        <p className="eyebrow">What you type, and what comes back</p>
        <h2 id="proof">From a sentence to a sent campaign</h2>
        <p className="muted">
          Four prompts in Claude Code, and what each one returns. Every command is the one Claude runs for you, and
          every output comes from a real run.
        </p>
        <ol className="steps convo">
          <li>
            <Prompt text="Find VPs and heads of marketing at 50 to 200 person SaaS companies in Apollo. Keep the ones likely to own outbound tooling, write a first line and a PS from their recent posts, and add them to my Q3 VP Marketing campaign in Instantly. Five people to start." />
            <p className="convo-runs">
              Claude writes <code>apollo-to-instantly.yaml</code>:
            </p>
            <pre className="proof-yaml">
              <code>{PIPELINE}</code>
            </pre>
          </li>
          <li>
            <Prompt text="Dry-run it against my real accounts." />
            <p className="convo-runs">
              Claude runs <code>gtme run apollo-to-instantly.yaml --dry-run</code>:
            </p>
            <pre>
              <code>{DRY_RUN}</code>
            </pre>
            <p className="small muted">
              Five people found, judged, enriched, and drafted for fourteen cents. The send step checked the
              campaign and held all five.
            </p>
          </li>
          <li>
            <Prompt text="Looks good. Send it." />
            <p className="convo-runs">
              Claude asks before the armed run, and you confirm. Then it runs{" "}
              <code>gtme run apollo-to-instantly.yaml</code>, which adds the five to the campaign.
            </p>
          </li>
          <li>
            <Prompt text="Run it again." />
            <p className="convo-runs">
              Claude runs <code>gtme run apollo-to-instantly.yaml</code>:
            </p>
            <pre>
              <code>{RE_RUN}</code>
            </pre>
            <p className="small muted">
              Every paid step comes back from the ledger at $0, and <code>idempotency: email</code> keeps the send
              from adding anyone twice.
            </p>
          </li>
        </ol>
      </section>

      {starts.length > 0 ? (
        <section className="home-section" aria-labelledby="start">
          <p className="eyebrow">Start here</p>
          <h2 id="start">Pick a start by what you have on hand</h2>
          <p className="muted">
            Each start ends in a receipt, and nothing spends or sends until a page says so, right before the
            command. <Link href="/docs/start">Start</Link> compares them side by side.
          </p>
          <GateGrid gates={starts} />
        </section>
      ) : null}

      {explore.length > 0 ? (
        <section className="home-section" aria-labelledby="explore">
          <p className="eyebrow">Explore</p>
          <h2 id="explore">Go deeper</h2>
          <GateGrid gates={explore} />
        </section>
      ) : (
        <p className="cta">
          The docs could not be fetched just now. <Link href="/docs">Open the docs</Link>.
        </p>
      )}
    </div>
  );
}
