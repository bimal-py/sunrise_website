import type { NextConfig } from "next";

const YEAR = 60 * 60 * 24 * 365;

const nextConfig: NextConfig = {
  experimental: {
    // Dashboard photo uploads (shrunk to under 4 MB in the browser; Vercel's cap is 4.5 MB).
    serverActions: { bodySizeLimit: "4.5mb" },
  },
  images: {
    // Images are pre-built (scripts/optimize-images.py) and picked by our own
    // loader, so nothing is resized on request: no cold-start wait, no usage quota.
    loader: "custom",
    loaderFile: "./lib/image-loader.ts",
    // srcset widths = the pre-built sizes, so every candidate is a real file.
    deviceSizes: [480, 800, 1280],
    imageSizes: [],
  },
  async headers() {
    // Image files never change in place (a new picture gets a new name), so
    // browsers and the CDN can keep them for a year without re-checking.
    const immutable = [{ key: "Cache-Control", value: `public, max-age=${YEAR}, immutable` }];
    return [
      { source: "/images/:path*", headers: immutable },
      { source: "/brand/:path*", headers: immutable },
    ];
  },
};

export default nextConfig;
