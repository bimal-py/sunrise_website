"use client";

import Image from "next/image";
import { useState } from "react";
import { ImagePlus, X } from "lucide-react";
import type { MediaCollection } from "@/lib/media/process-image";
import type { ImageAsset } from "@/shared/domain/image";
import { uploadImage } from "../actions/media";
import { labelClass } from "./ui";

const MAX_SIDE = 2560;

/** Big camera photos are shrunk in the browser first: faster on mobile data, and under the upload limit. */
async function prepare(file: File): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 3_500_000) return file;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob ?? file), "image/jpeg", 0.9));
}

/**
 * A photo for a form: shows the current one, uploads a replacement (sizes are built on the
 * server) and sends the result as JSON in a hidden input named `name`.
 */
export function ImageField({ name, label, collection, defaultValue, hint }: { name: string; label: string; collection: MediaCollection; defaultValue: ImageAsset | null; hint?: string }) {
  const [image, setImage] = useState<ImageAsset | null>(defaultValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.set("file", await prepare(file), file.name.replace(/\.(png|webp)$/i, ".jpg"));
      body.set("collection", collection);
      const result = await uploadImage(body);
      if (result.ok) setImage(result.image);
      else setError(result.error);
    } catch {
      setError("Upload failed. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-w-0">
      <p className={labelClass}>{label}</p>
      <input type="hidden" name={name} value={image ? JSON.stringify(image) : ""} />
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex h-28 w-40 shrink-0 items-center justify-center overflow-hidden rounded-card border border-line-strong bg-raised">
          {image ? (
            <Image src={image.src} alt="" width={image.width} height={image.height} sizes="160px" placeholder={image.blurDataURL ? "blur" : "empty"} blurDataURL={image.blurDataURL || undefined} className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-muted">No photo</span>
          )}
          {busy && <span className="absolute inset-0 flex items-center justify-center bg-background/70 text-xs text-strong">Uploading…</span>}
        </div>
        <div className="flex flex-col items-start gap-2">
          <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-control border border-line-strong px-3 text-sm text-strong transition-colors duration-150 hover:border-primary hover:text-primary has-[:focus-visible]:border-primary">
            <ImagePlus className="h-4 w-4" aria-hidden />
            {image ? "Replace photo" : "Upload photo"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="sr-only"
              disabled={busy}
              onChange={(event) => {
                void onFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>
          {image && (
            <button type="button" onClick={() => setImage(null)} className="inline-flex min-h-8 items-center gap-1 text-sm text-muted hover:text-error">
              <X className="h-4 w-4" aria-hidden /> Remove
            </button>
          )}
        </div>
      </div>
      {error ? <p className="mt-2 text-sm text-error">{error}</p> : hint ? <p className="mt-2 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
