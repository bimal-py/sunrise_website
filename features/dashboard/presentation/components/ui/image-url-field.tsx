"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Plus, X } from "lucide-react";
import type { MediaCollection } from "@/lib/media/process-image";
import type { ImageAsset } from "@/shared/domain/image";
import { resolveImageUrl } from "../../actions/media";
import { DashboardField, DashboardInput } from "./dashboard-ui";
import { FilePickerDialog } from "./file-picker-dialog";
import { useProgressWhile } from "./use-progress-while";

/** A gallery photo: the photo plus its description. */
export type GalleryImage = ImageAsset & { alt: string };

type FieldText = { required?: boolean; help?: ReactNode; example?: string; hint?: ReactNode };

/** The address shown for a photo: a real file (its 1280px size) that opens in a browser and can be pasted anywhere. */
function addressOf(image: ImageAsset | null): string {
  if (!image) return "";
  return /\.webp$/.test(image.src) && !/-(480|800|1280|1920)\.webp$/.test(image.src) ? image.src.replace(/\.webp$/, "-1280.webp") : image.src;
}

/**
 * While a photo is still being fetched, a save would store the old one: hold the form's
 * submit back until it's done (capture phase, before React's own handlers see it).
 */
function useHoldSubmitWhile(root: RefObject<HTMLElement | null>, busy: RefObject<boolean>, onHeld: () => void) {
  const held = useRef(onHeld);
  useEffect(() => {
    held.current = onHeld;
  });
  useEffect(() => {
    const form = root.current?.closest("form");
    if (!form) return;
    const hold = (event: Event) => {
      if (!busy.current) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      held.current();
    };
    form.addEventListener("submit", hold, true);
    return () => form.removeEventListener("submit", hold, true);
  }, [root, busy]);
}

const iconButton =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-control border border-line-strong text-muted transition-colors duration-150 hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 pointer-coarse:size-11";

/**
 * A photo for a form, as on the portfolio: a text field with the photo's address and a
 * button inside its right edge that opens the file picker (choose from the library, or
 * upload there). Pasting a link and leaving the field (or pressing Enter) fetches it: one of
 * the site's own photos is used as it is, anything else is copied into the library with the
 * usual sizes. Shows a preview with Remove, and sends the photo as JSON in a hidden input
 * named `name`; the server reads the photo back from the media library (imageFromForm in
 * features/dashboard/data/image-input.ts), so nothing the browser sends about it is trusted.
 */
export function ImageUrlField({
  name,
  label,
  collection,
  defaultValue,
  required,
  help,
  example,
  hint,
}: { name: string; label: string; collection: MediaCollection; defaultValue: ImageAsset | null } & FieldText) {
  const [image, setImage] = useState<ImageAsset | null>(defaultValue);
  const [text, setText] = useState(addressOf(defaultValue));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [picking, setPicking] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  useProgressWhile(busy);
  useHoldSubmitWhile(root, busyRef, () => setError("Wait a moment: the photo is still loading. Then save again."));

  const choose = (next: ImageAsset | null) => {
    setImage(next);
    setText(addressOf(next));
    setError("");
  };

  async function resolveText() {
    const value = text.trim();
    if (busyRef.current || value === addressOf(image) || (image && value === image.src)) return;
    if (!value) return choose(null);
    busyRef.current = true;
    setBusy(true);
    setError("");
    const result = await resolveImageUrl(value, collection).catch(() => ({ ok: false as const, error: "Couldn't reach the server. Check your connection and try again." }));
    busyRef.current = false;
    setBusy(false);
    if (result.ok) choose(result.image);
    else setError(result.error);
  }

  return (
    <div ref={root} className="min-w-0">
      <DashboardField as="div" label={label} required={required} help={help} example={example} hint={hint} error={error}>
        <input type="hidden" name={name} value={image ? JSON.stringify(image) : ""} />
        <div className="relative">
          <DashboardInput
            type="text"
            inputMode="url"
            value={text}
            readOnly={busy}
            onChange={(event) => {
              setText(event.target.value);
              setError("");
            }}
            onBlur={() => void resolveText()}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              void resolveText();
            }}
            placeholder="Paste a photo's link, or choose one"
            aria-label={label}
            aria-invalid={error ? true : undefined}
            autoComplete="off"
            spellCheck={false}
            className="pr-12"
          />
          <button
            type="button"
            onClick={() => setPicking(true)}
            disabled={busy}
            aria-label={`Choose ${label.toLowerCase()} from the photo library`}
            title="Choose from the photo library"
            className="absolute right-1 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-control text-muted transition-colors duration-150 hover:bg-surface hover:text-primary disabled:cursor-wait"
          >
            {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <ImagePlus size={16} aria-hidden />}
          </button>
        </div>
        {image ? (
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <div className="relative h-28 w-40 shrink-0 overflow-hidden rounded-card border border-line-strong bg-raised">
              <Image
                src={image.src}
                alt=""
                fill
                sizes="160px"
                placeholder={image.blurDataURL ? "blur" : "empty"}
                blurDataURL={image.blurDataURL || undefined}
                className="object-cover"
              />
            </div>
            <div className="flex flex-col items-start gap-1">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                {image.width} × {image.height}
              </span>
              <button type="button" onClick={() => setPicking(true)} disabled={busy} className="inline-flex min-h-8 items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline">
                <ImagePlus size={14} aria-hidden /> Change
              </button>
              <button type="button" onClick={() => choose(null)} disabled={busy} className="inline-flex min-h-8 items-center gap-1.5 text-sm text-muted transition-colors duration-150 hover:text-error">
                <X size={14} aria-hidden /> Remove
              </button>
            </div>
          </div>
        ) : null}
      </DashboardField>
      <FilePickerDialog
        open={picking}
        onClose={() => setPicking(false)}
        mode="image"
        collection={collection}
        onPick={(result) => {
          if (result.kind !== "image") return;
          const { src, width, height, blurDataURL, ogImage } = result.image;
          choose({ src, width, height, blurDataURL, ogImage });
        }}
      />
    </div>
  );
}

/**
 * Several photos in order (product photos): add from the file picker (choose several, or
 * upload), move each up or down, describe each, remove. The first is the main photo. Sends a
 * JSON array of photos with their descriptions in a hidden input named `name`.
 */
export function ImageGalleryField({
  name,
  label,
  collection,
  defaultValue,
  max = 12,
  required,
  help,
  example,
  hint,
}: { name: string; label: string; collection: MediaCollection; defaultValue: GalleryImage[]; max?: number } & FieldText) {
  const [images, setImages] = useState<GalleryImage[]>(() => (defaultValue ?? []).slice(0, max));
  const [picking, setPicking] = useState(false);
  const room = Math.max(0, max - images.length);

  const add = (image: GalleryImage) =>
    setImages((current) => (current.some((entry) => entry.src === image.src) || current.length >= max ? current : [...current, image]));
  const move = (index: number, step: -1 | 1) =>
    setImages((current) => {
      const target = index + step;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  const describe = (index: number, alt: string) => setImages((current) => current.map((entry, i) => (i === index ? { ...entry, alt } : entry)));
  const remove = (index: number) => setImages((current) => current.filter((_, i) => i !== index));

  const addButton = (
    <button
      type="button"
      onClick={() => setPicking(true)}
      disabled={room === 0}
      className="flex w-full items-center justify-center gap-2 rounded-card border border-dashed border-line-strong px-4 py-4 text-sm text-muted transition-colors duration-150 hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Plus size={15} aria-hidden /> {images.length === 0 ? "Add photos" : `Add more (${room} left)`}
    </button>
  );

  return (
    <div className="min-w-0">
      <DashboardField as="div" label={label} required={required} help={help} example={example} hint={hint}>
        <input type="hidden" name={name} value={JSON.stringify(images)} />
        {images.length > 0 ? (
          <ol className="grid gap-2.5">
            {images.map((image, index) => (
              <li key={image.src} className="flex min-w-0 items-center gap-3 rounded-card border border-line-strong bg-raised p-2.5">
                <div className="relative size-20 shrink-0 overflow-hidden rounded-control bg-surface">
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    sizes="80px"
                    placeholder={image.blurDataURL ? "blur" : "empty"}
                    blurDataURL={image.blurDataURL || undefined}
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">{index === 0 ? "Main photo" : `Photo ${index + 1}`}</p>
                  <DashboardInput
                    value={image.alt}
                    onChange={(event) => describe(index, event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.preventDefault();
                    }}
                    maxLength={300}
                    placeholder="Describe the photo (what's in it)"
                    aria-label={`Description of photo ${index + 1}`}
                    className="mt-1.5 px-3 py-2 text-xs"
                  />
                </div>
                <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
                  <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move photo ${index + 1} up`} className={iconButton}>
                    <ArrowUp size={15} aria-hidden />
                  </button>
                  <button type="button" onClick={() => move(index, 1)} disabled={index === images.length - 1} aria-label={`Move photo ${index + 1} down`} className={iconButton}>
                    <ArrowDown size={15} aria-hidden />
                  </button>
                  <button type="button" onClick={() => remove(index)} aria-label={`Remove photo ${index + 1}`} className={`${iconButton} hover:border-error/50 hover:text-error`}>
                    <X size={15} aria-hidden />
                  </button>
                </div>
              </li>
            ))}
            {room > 0 ? <li>{addButton}</li> : null}
          </ol>
        ) : (
          addButton
        )}
      </DashboardField>
      <FilePickerDialog
        open={picking}
        onClose={() => setPicking(false)}
        mode="image"
        collection={collection}
        max={Math.max(1, room)}
        onPick={(result) => {
          if (result.kind === "image") add({ ...result.image, alt: result.image.alt ?? "" });
        }}
      />
    </div>
  );
}
