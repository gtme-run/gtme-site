import type { NextConfig } from "next";

const START_RAW =
  "https://raw.githubusercontent.com/gtme-run/gtme/main/START.md";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/get", destination: "/docs/start/install", permanent: true },
      { source: "/start", destination: "/docs/start", permanent: true },
      // The catalog's word is connector; its address is the registry (the
      // index every entry comes from). Both spellings land in one place.
      { source: "/connectors", destination: "/registry", permanent: true },
      { source: "/connectors/:path*", destination: "/registry/:path*", permanent: true },
    ];
  },
  async rewrites() {
    return {
      // beforeFiles so the rewrite wins over any static file or route.
      beforeFiles: [{ source: "/start.md", destination: START_RAW }],
      afterFiles: [],
      fallback: [],
    };
  },
  async headers() {
    return [
      {
        source: "/start.md",
        headers: [
          { key: "Content-Type", value: "text/markdown; charset=utf-8" },
          { key: "Cache-Control", value: "public, max-age=0, s-maxage=300" },
        ],
      },
    ];
  },
};

export default nextConfig;
