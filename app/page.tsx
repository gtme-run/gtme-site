import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "gtme: GTM as code",
  description:
    "A CLI for GTM data pipelines. A YAML file describes a campaign, and an append-only ledger makes re-runs cheaper and never delivers twice.",
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
      campaign: "Q3 VP Marketing"
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
send: preflight ok — 3 check(s) (✓ campaign active, ✓ variable first_line referenced, ✓ variable ps_line referenced)
total: $0.1437 (estimated) spent`;

const RE_RUN = `step         adapter                    in  out  empty  cached  filtered  failed  cost  avoided
source       apollo/search              0   5    -      0       -         -       $0    -
icp-filter   ai/filter                  5   0    -      5       -         -       $0    ?
reveal       apollo/enrich              5   0    -      5       -         -       $0    $0.0500
linkedin     harvest/profile            5   0    -      5       -         -       $0    $0.0600
personalize  ai/compose                 5   0    -      5       -         -       $0    ?
send         instantly/add-to-campaign  5   0    -      5       -         -       $0    $0.0000
total: $0 (estimated) spent, $0.1100+? avoided via cache (25 records skipped)`;

export default function HomePage() {
  return (
    <article>
      <h1>GTM as code</h1>
      <p className="lede">
        gtme is a CLI for GTM data pipelines: a small YAML file describes a
        campaign, the runner executes it against vendor adapters, and an
        append-only ledger remembers every fact, so re-runs cost less and
        nothing is delivered twice.
      </p>

      <pre>
        <code>{PIPELINE}</code>
      </pre>

      <pre>
        <code>{DRY_RUN}</code>
      </pre>

      <p>
        That&apos;s a dry run against live Apollo, Harvest, Anthropic, and
        Instantly. Apollo returned five people by title and company size,
        and the AI judge kept all five. Apollo revealed their contact
        details, Harvest pulled their LinkedIn profiles, and the model wrote
        two lines for each. The send step checked the campaign and held all
        five, so nothing went out. The run cost fourteen cents.
      </p>

      <p>
        After an armed run adds the five to the campaign, run it again and
        the paid steps come back from the ledger:
      </p>

      <pre>
        <code>{RE_RUN}</code>
      </pre>

      <p>
        Every paid step reads <code>cached 5</code> and spends $0. The Apollo
        and Harvest rows show their dollars under <code>avoided</code>, and
        the AI rows show a <code>?</code>, which is why the total ends in{" "}
        <code>+?</code>. The send row is cached too: the five are already in
        the campaign, and <code>idempotency: email</code> keeps a re-run
        from adding anyone twice.
      </p>

      <h2>Install</h2>
      <pre>
        <code>brew install gtme-run/tap/gtme     # macOS and Linux, arm64 and amd64</code>
      </pre>
      <p className="small muted">
        The formula installs one static binary. Nothing runs in the
        background, and there&apos;s no account to create. The example
        runs five people because that&apos;s the size we recommend for a
        first run; <code>limit:</code> is the line to raise after that.{" "}
        <Link href="/docs/start/install">Install</Link> covers the release
        tarball, <code>go install</code>, and building from a checkout.
      </p>

      <p className="cta">
        <Link href="/docs/start">Start</Link> has four ways to begin, sorted
        by what you have on hand. The first needs no keys and spends nothing.
      </p>
    </article>
  );
}
