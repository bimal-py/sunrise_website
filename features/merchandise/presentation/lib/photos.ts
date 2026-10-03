/**
 * Product photos are pre-built at fixed widths (lib/media/process-image.ts): "<name>-480/800/1280.webp",
 * plus "<name>-1920.webp" for the zoom when a photo uploaded to "products" is wider than 1280px.
 * A photo's `src` is its logical address ("…/<name>.webp"), which is not a file itself.
 */

/** Uploads: "<storage>/media/<collection>/<name>.webp". */
const UPLOAD = /^(https:\/\/[^/]+\/storage\/v1\/object\/public\/media\/([a-z0-9-]+))\/([A-Za-z0-9_-]+)\.webp$/;
/** Photos built into the site: "/images/<collection>/<name>.webp". */
const LOCAL = /^(\/images\/(?:blog|films))\/([A-Za-z0-9_-]+)\.webp$/;
/** A pasted size file ("…-1280.webp") is already a real file. */
const SIZED = /-(480|800|1280|1920)$/;

const WIDTHS = [480, 800, 1280];
const ZOOM_WIDTH = 1920;

export type PhotoFile = { src: string; width: number };

/** Every real file of a photo, smallest first, each with the width it actually has (sizes are never upscaled). */
export function photoFiles(photo: { src: string; width: number }): PhotoFile[] {
  let base: string | null = null;
  let widths = WIDTHS;
  const upload = UPLOAD.exec(photo.src);
  const local = LOCAL.exec(photo.src);
  if (upload && !SIZED.test(upload[3])) {
    base = `${upload[1]}/${upload[3]}`;
    if (upload[2] === "products" && photo.width > WIDTHS[WIDTHS.length - 1]) widths = [...WIDTHS, ZOOM_WIDTH];
  } else if (local && !SIZED.test(local[2])) {
    base = `${local[1]}/${local[2]}`;
  }
  if (!base) return [{ src: photo.src, width: photo.width }];

  const files: PhotoFile[] = [];
  for (const target of widths) {
    const width = Math.min(target, photo.width);
    if (files.some((file) => file.width === width)) continue;
    files.push({ src: `${base}-${target}.webp`, width });
  }
  return files;
}

/** The biggest file: the zoom pane, the full-screen viewer, structured data and the sitemap. */
export function largestPhoto(photo: { src: string; width: number }): PhotoFile {
  const files = photoFiles(photo);
  return files[files.length - 1];
}

/** srcset over every real file (the viewer can reach the zoom size; next/image stops at 1280). */
export function photoSrcSet(photo: { src: string; width: number }): string | undefined {
  const files = photoFiles(photo);
  return files.length > 1 ? files.map((file) => `${file.src} ${file.width}w`).join(", ") : undefined;
}

export type Rect = { x: number; y: number; width: number; height: number };

/** Where a photo of the given proportions is drawn inside a frame with object-fit: contain. */
export function containRect(frameWidth: number, frameHeight: number, naturalWidth: number, naturalHeight: number): Rect {
  if (frameWidth <= 0 || frameHeight <= 0 || naturalWidth <= 0 || naturalHeight <= 0) return { x: 0, y: 0, width: 0, height: 0 };
  const scale = Math.min(frameWidth / naturalWidth, frameHeight / naturalHeight);
  const width = naturalWidth * scale;
  const height = naturalHeight * scale;
  return { x: (frameWidth - width) / 2, y: (frameHeight - height) / 2, width, height };
}

/** The zoom shows the big file at up to its own pixels, and at most 3× the photo as drawn. */
export const ZOOM_LIMITS = { min: 1.3, max: 3 } as const;

/** How much the zoom pane magnifies the drawn photo; null when the file has little more detail to show. */
export function zoomFactor(drawnWidth: number, sourceWidth: number): number | null {
  if (drawnWidth <= 0 || sourceWidth <= 0) return null;
  const factor = Math.min(sourceWidth / drawnWidth, ZOOM_LIMITS.max);
  return factor >= ZOOM_LIMITS.min ? factor : null;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * The lens over the photo (drawn-photo pixels), centred on the pointer and kept inside the
 * photo, and where the magnified photo sits in the pane. The pane is the drawn photo's size,
 * so the lens is the pane's size divided by the zoom: what's under the lens fills the pane.
 */
export function lensAt(pointerX: number, pointerY: number, drawn: { width: number; height: number }, factor: number) {
  const width = drawn.width / factor;
  const height = drawn.height / factor;
  const x = clamp(pointerX - width / 2, 0, drawn.width - width);
  const y = clamp(pointerY - height / 2, 0, drawn.height - height);
  return { x, y, width, height, offsetX: -x * factor, offsetY: -y * factor };
}
