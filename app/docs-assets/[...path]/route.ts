import { readLocalAsset } from "@/lib/docs";

// Serves docs/_assets/* in local preview (DOCS_DIR). In production, image
// URLs point straight at raw GitHub and this route redirects there.
const TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  svg: "image/svg+xml",
  webp: "image/webp",
  webm: "video/webm",
  mp4: "video/mp4",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const rel = (await params).path.join("/");
  if (!process.env.DOCS_DIR) {
    const ref = process.env.DOCS_REF ?? "main";
    return Response.redirect(
      `https://raw.githubusercontent.com/gtme-run/gtme/${ref}/docs/_assets/${rel}`,
      307,
    );
  }
  const bytes = await readLocalAsset(rel);
  if (!bytes) return new Response("Not found", { status: 404 });
  const ext = rel.split(".").pop()?.toLowerCase() ?? "";
  return new Response(new Uint8Array(bytes), {
    headers: { "Content-Type": TYPES[ext] ?? "application/octet-stream" },
  });
}
