import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships WebAssembly + data files that must load from node_modules at runtime.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Sprints and the evidence record were removed (design/REMOVED.md). Old links land on the Career
  // map; temporary (307) so browsers don't cache them if the routes ever return.
  async redirects() {
    return [
      { source: "/sprints", destination: "/lanes", permanent: false },
      { source: "/sprints/:path*", destination: "/lanes", permanent: false },
      { source: "/evidence", destination: "/lanes", permanent: false },
      { source: "/evidence/:path*", destination: "/lanes", permanent: false },
      { source: "/lanes/:lane/plan", destination: "/lanes?lane=:lane", permanent: false },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
