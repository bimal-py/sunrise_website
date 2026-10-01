"use client";

/**
 * next/image loader. Photos are pre-built at fixed widths by
 * scripts/optimize-images.py (public/images/<collection>/<name>-<width>.webp),
 * so the browser downloads a static, long-cached file instead of waiting for
 * on-demand resizing. A photo is referenced by its logical path
 * "/images/<collection>/<name>.webp"; this picks the smallest pre-built width
 * that covers the requested one. Any other image is served as-is.
 */
export const COLLECTION_WIDTHS: Record<string, number[]> = {
  // keep in sync with COLLECTIONS in scripts/optimize-images.py
  blog: [480, 800, 1280],
  films: [480, 800, 1280],
};

const PHOTO = /^\/images\/(blog|films)\/([A-Za-z0-9_-]+)\.webp$/;

/** Uploads from the dashboard: "<storage>/media/<collection>/<name>.webp" → "…/<name>-<width>.webp" (lib/media/process-image.ts). */
const UPLOAD = /^(https:\/\/[^/]+\/storage\/v1\/object\/public\/media\/[a-z0-9-]+)\/([A-Za-z0-9_-]+)\.webp$/;
const UPLOAD_WIDTHS = [480, 800, 1280];

export default function imageLoader({ src, width }: { src: string; width: number; quality?: number }) {
  const upload = UPLOAD.exec(src);
  if (upload) return `${upload[1]}/${upload[2]}-${UPLOAD_WIDTHS.find((w) => w >= width) ?? 1280}.webp`;
  const match = PHOTO.exec(src);
  if (!match) return src;
  const widths = COLLECTION_WIDTHS[match[1]];
  const size = widths.find((w) => w >= width) ?? widths[widths.length - 1];
  return `/images/${match[1]}/${match[2]}-${size}.webp`;
}
