/**
 * A photo the site can show at any width: pre-built 480/800/1280 webp sizes (picked by
 * lib/image-loader.ts from `src`), a blur placeholder, and a 1200×630 JPEG for link previews.
 * Built by scripts/optimize-images.py for files in /public, or by the dashboard on upload.
 */
export type ImageAsset = {
  /** Logical path: "/images/<collection>/<name>.webp" or the Storage URL of "<collection>/<name>.webp". */
  src: string;
  width: number;
  height: number;
  blurDataURL: string;
  /** Absolute or root-relative URL of the 1200×630 share image. */
  ogImage: string;
};
