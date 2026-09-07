import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Get gtme",
  description:
    "Install gtme: Homebrew tap, a checksummed release tarball, or build from source with ./install.sh. Nothing pipes a download into a shell.",
};

const RELEASES = "https://github.com/gtme-run/gtme/releases";
const LATEST = `${RELEASES}/latest`;

export default function GetPage() {
  return (
    <article>
      <h1>Get gtme</h1>
      <p className="lede">
        One static binary for macOS or Linux, arm64 or amd64. Pick one of
        three ways. Nothing here pipes a download into a shell, and nothing
        phones home.
      </p>

      <h2>1. Homebrew</h2>
      <pre>
        <code>brew install gtme-run/tap/gtme</code>
      </pre>
      <p>
        The{" "}
        <a href="https://github.com/gtme-run/homebrew-tap">tap</a>{" "}
        installs the prebuilt binary from the{" "}
        <a href={RELEASES}>releases page</a>, verified against the{" "}
        <code>checksums.txt</code> published beside it.
      </p>

      <h2>2. Release tarball</h2>
      <p>
        Every release ships one tarball per platform plus a{" "}
        <code>checksums.txt</code>. Download both from{" "}
        <a href={LATEST}>{LATEST}</a>, verify, untar, and put{" "}
        <code>gtme</code> on your PATH.
      </p>
      <pre>
        <code>{`# assets on the latest release page:
#   gtme_<version>_darwin_arm64.tar.gz
#   gtme_<version>_darwin_amd64.tar.gz
#   gtme_<version>_linux_arm64.tar.gz
#   gtme_<version>_linux_amd64.tar.gz
#   checksums.txt

# after downloading a tarball and checksums.txt into the same directory:
shasum -a 256 --check --ignore-missing checksums.txt
tar -xzf gtme_<version>_<os>_<arch>.tar.gz
mv gtme ~/.local/bin/        # or anywhere on your PATH`}</code>
      </pre>

      <h2>3. From source</h2>
      <p>Requires Go 1.24 or newer.</p>
      <pre>
        <code>{`git clone https://github.com/gtme-run/gtme && cd gtme
./install.sh        # builds gtme, installs it to ~/.local/bin, runs gtme init`}</code>
      </pre>
      <p>
        <code>install.sh</code> is deliberately boring: it compiles from the
        checkout and copies one static binary into place. It warns you if{" "}
        <code>~/.local/bin</code> is not on your PATH (add it to your shell
        profile, or run <code>PREFIX=/usr/local ./install.sh</code> instead).
        Building from source also installs the repo&apos;s example external
        adapters, so the README quickstart works offline. Prefer not to
        install? <code>make build</code> gives you <code>./bin/gtme</code>.
      </p>

      <h2>Then</h2>
      <pre>
        <code>{`gtme version      # prints the version
gtme init         # creates ~/.gtme and the ledger; safe to repeat`}</code>
      </pre>
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
