// The latest release and the star count, read from GitHub on the server and
// refreshed hourly. Hidden until the repo has MIN_STARS stars, and whenever
// GitHub doesn't answer.

const REPO = "gtme-run/gtme";
const MIN_STARS = 20;

async function github<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 3600 },
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

export default async function RepoPill() {
  const [repo, release] = await Promise.all([
    github<{ stargazers_count?: unknown }>(""),
    github<{ tag_name?: unknown }>("/releases/latest"),
  ]);
  const stars = typeof repo?.stargazers_count === "number" ? repo.stargazers_count : 0;
  if (stars < MIN_STARS) return null;
  const tag = typeof release?.tag_name === "string" ? release.tag_name : null;
  return (
    <p className="repo-pill">
      {tag ? (
        <a href={`https://github.com/${REPO}/releases/tag/${tag}`} className="repo-pill-tag">
          {tag}
        </a>
      ) : null}
      <a href={`https://github.com/${REPO}`} className="repo-pill-star">
        <span aria-hidden="true">★</span> {stars.toLocaleString("en-US")} stars on GitHub
      </a>
    </p>
  );
}
