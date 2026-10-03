"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { ProductImage } from "@/features/merchandise/domain/entities";
import { largestPhoto, photoSrcSet } from "../lib/photos";

const control =
  "flex size-11 items-center justify-center rounded-full border border-line-strong bg-background/85 text-foreground transition-colors duration-150 hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-30";

/**
 * The product's photos full screen: a native modal <dialog>, so focus stays inside, Esc
 * closes it and focus goes back to the photo that opened it. Swipe between photos (scroll
 * snap), or use the arrows (mouse) and the arrow keys. The browser picks each photo's file
 * from every pre-built width, up to the zoom size. `onClose` gets the photo last on show.
 */
export function PhotoViewer({ images, name, start, onClose }: { images: ProductImage[]; name: string; start: number; onClose: (index: number) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const current = useRef(start);
  const [index, setIndex] = useState(start);
  const count = images.length;

  useEffect(() => {
    const el = dialog.current;
    const strip = track.current;
    if (!el || !strip) return;
    if (!el.open) el.showModal();
    strip.scrollTo({ left: start * strip.clientWidth, behavior: "instant" });
    closeButton.current?.focus();
    // The page behind stays put (the root has a stable scrollbar gutter, so nothing shifts).
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = overflow;
    };
  }, [start]);

  useEffect(() => {
    const strip = track.current;
    if (!strip) return;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!strip.clientWidth) return;
        const next = Math.min(Math.max(Math.round(strip.scrollLeft / strip.clientWidth), 0), count - 1);
        current.current = next;
        setIndex(next);
      });
    };
    strip.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      strip.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [count]);

  const go = (next: number) => {
    const strip = track.current;
    if (!strip) return;
    const target = Math.min(Math.max(next, 0), count - 1);
    strip.scrollTo({ left: target * strip.clientWidth, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      go(current.current + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(current.current - 1);
    }
  };

  return (
    <dialog
      ref={dialog}
      aria-label={`Photos of ${name}`}
      onClose={() => onClose(current.current)}
      onKeyDown={onKeyDown}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-hidden border-0 bg-background p-0 text-foreground backdrop:bg-background"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-4 px-4 pb-2 pt-3 sm:px-6">
          <p className="min-w-0 truncate font-mono text-xs uppercase tracking-[0.16em] text-muted" aria-live="polite">
            {count > 1 ? `${index + 1} / ${count}` : name}
          </p>
          <button ref={closeButton} type="button" onClick={() => dialog.current?.close()} aria-label="Close photos" className={`${control} shrink-0`}>
            <X size={18} aria-hidden />
          </button>
        </div>
        <div
          ref={track}
          className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((image, i) => (
            <div key={`${i}-${image.src}`} className="flex h-full w-full shrink-0 snap-center snap-always items-center justify-center px-2 pb-6 sm:px-20">
              {/* eslint-disable-next-line @next/next/no-img-element -- every pre-built width up to the zoom size; next/image's loader stops at 1280 */}
              <img
                src={largestPhoto(image).src}
                srcSet={photoSrcSet(image)}
                sizes="100vw"
                alt={image.alt || name}
                width={image.width}
                height={image.height}
                loading={Math.abs(i - start) <= 1 ? "eager" : "lazy"}
                decoding="async"
                draggable={false}
                style={{ backgroundImage: `url("${image.blurDataURL}")` }}
                className="max-h-full max-w-full bg-contain bg-center bg-no-repeat object-contain"
              />
            </div>
          ))}
        </div>
      </div>
      {count > 1 && (
        <>
          <button type="button" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous photo" className={`${control} absolute left-4 top-1/2 hidden -translate-y-1/2 pointer-fine:flex`}>
            <ChevronLeft size={20} aria-hidden />
          </button>
          <button type="button" onClick={() => go(index + 1)} disabled={index === count - 1} aria-label="Next photo" className={`${control} absolute right-4 top-1/2 hidden -translate-y-1/2 pointer-fine:flex`}>
            <ChevronRight size={20} aria-hidden />
          </button>
        </>
      )}
    </dialog>
  );
}
