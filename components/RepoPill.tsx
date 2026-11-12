// The latest release and a star link, read from GitHub on the server and
// refreshed hourly. If GitHub doesn't answer, only the star link shows.

const REPO = "gtme-run/gtme";

async function latestTag(): Promise<string | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { tag_name?: unknown };
    return typeof data.tag_name === "string" ? data.tag_name : null;
  } catch {
    return null;
  }
}

export default async function RepoPill() {
  const tag = await latestTag();
  return (
    <p className="repo-pill">
      {tag ? (
        <a href={`https://github.com/${REPO}/releases/tag/${tag}`} className="repo-pill-tag">
          {tag}
        </a>
      ) : null}
      <a href={`https://github.com/${REPO}`} className="repo-pill-star">
        <span aria-hidden="true">★</span> Star on GitHub
      </a>
    </p>
  );
}
