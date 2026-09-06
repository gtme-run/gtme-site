import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "gtme — GTM as code",
  description:
    "Built for engineers who do GTM. A CLI, a ledger you can query, YAML you can diff, and receipts for every dollar.",
};

const PIPELINE = `name: q3-outbound
source:
  use: apollo/search              # a vendor adapter that is ~150 lines of YAML
  with: { query: "vp marketing, saas", limit: 200 }
steps:
  - id: fit
    use: ai/filter                # AI judgment behind the same contract as any step
    uses: [full_name, title, company_domain]
    with: { prompt: Keep people who own outbound tooling decisions. }
  - id: lines
    use: ai/compose
    when: fit.passed
    uses: [full_name, title, company_name]
    with: { prompt: Write first_line and ps_line for a short, honest intro. }
  - id: send                      # delivery is a step like any other — put it anywhere, use several
    use: instantly/add-to-campaign
    with: { campaign: "Q3 VP Marketing" }
    variables: { first_line: first_line, ps_line: ps_line }
    idempotency: email            # re-runs deliver nothing twice, ever`;

const RECEIPT = `$ gtme run q3-outbound.yaml
...
step     adapter                   in   out  cached  cost     avoided
source   apollo/search             0    200  0       $0       -
fit      ai/filter                 200  74   0       $0.19    -
lines    ai/compose                74   74   0       $0.31    -
send     instantly/add-to-campaign 74   74   0       $0       -
total: $0.50 spent`;

export default function HomePage() {
  return (
    <article>
      <h1>GTM as code</h1>
      <p className="lede">
        <strong>Built for engineers who do GTM — not the other way around.</strong>
      </p>
      <p>
        Outbound tooling assumes you want a UI, credits, and someone else&apos;s
        opinion of your workflow. If you&apos;d rather have a CLI, a ledger you
        can query, YAML you can diff, and receipts for every dollar — this is
        that. Campaigns are pipelines. Adapters are data. Judgment is
        versioned. Everything replays.
      </p>

      <pre>
        <code>{PIPELINE}</code>
      </pre>

      <pre>
        <code>{RECEIPT}</code>
      </pre>

      <p>
        Run it again Monday with fresh data: overlapping records cache-skip,
        the receipt shows dollars <em>avoided</em>, and nobody gets delivered
        twice.
      </p>

      <h2>Install</h2>
      <pre>
        <code>brew install elegant-atomics/tap/gtme     # macOS and Linux, arm64 and amd64</code>
      </pre>
      <p className="small muted">
        A single static binary. No daemon, no hosted anything, no login.{" "}
        <Link href="/get">Other ways to install.</Link>
      </p>

      <p className="cta">
        <Link href="/start">Start here →</Link>
        <br />
        <span className="small muted">
          Four doors, each one pipeline file, each ending in a receipt.
        </span>
      </p>
    </article>
  );
}
