import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "gtme: GTM as code",
  description:
    "A CLI for GTM data pipelines. A YAML file describes a campaign, and an append-only ledger makes re-runs cheaper and never delivers twice.",
};

const PIPELINE = `name: q3-outbound
source:
  use: apollo/search              # an adapter: a vendor's API, described in YAML
  with: { query: "vp marketing, saas", limit: 200 }
steps:
  - id: fit
    use: ai/filter                # an AI judge, under the same contract as any step
    uses: [full_name, title, company_domain]
    with: { template: Keep people who own outbound tooling decisions. }
  - id: lines
    use: ai/compose
    when: fit.passed
    uses: [full_name, title, company_name]
    with: { template: Write first_line and ps_line for a short, honest intro. }
  - id: send                      # delivery is a step too; a pipeline can have several
    use: instantly/add-to-campaign
    with: { campaign: "Q3 VP Marketing" }
    variables: { first_line: first_line, ps_line: ps_line }
    idempotency: email            # a re-run never adds the same email twice`;

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
        gtme is a CLI for GTM data pipelines: a small YAML file describes a
        campaign, the runner executes it against vendor adapters, and an
        append-only ledger remembers every fact, so re-runs cost less and
        nothing is delivered twice.
      </p>

      <pre>
        <code>{PIPELINE}</code>
      </pre>

      <pre>
        <code>{RECEIPT}</code>
      </pre>

      <p>
        This campaign searches Apollo for 200 people, has an AI judge keep
        the 74 who own outbound tooling, writes two lines for each of them,
        and adds them to an Instantly campaign. The receipt has one row per
        step, with what went in, what came out, and what it cost.
      </p>
      <p>
        Run it again Monday with fresh data. People the ledger already has
        answers for skip the steps that produced them, and the receipt shows
        those dollars as avoided. Anyone already in the campaign stays out
        of it, because <code>idempotency: email</code> holds across runs.
      </p>

      <h2>Install</h2>
      <pre>
        <code>brew install gtme-run/tap/gtme     # macOS and Linux, arm64 and amd64</code>
      </pre>
      <p className="small muted">
        The formula installs one static binary. Nothing runs in the
        background, and there&apos;s no account to create.{" "}
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
