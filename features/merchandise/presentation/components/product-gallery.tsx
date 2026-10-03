"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import type { ProductImage } from "@/features/merchandise/domain/entities";
import { containRect, largestPhoto, lensAt, zoomFactor } from "../lib/photos";
import { PhotoViewer } from "./photo-viewer";
import { usePhotoOnShow } from "./product-selection";

/** The main photo's width: the gallery column from lg, else the gallery capped at 560px. */
const SIZES = "(min-width: 1280px) 440px, (min-width: 1024px) 46vw, (min-width: 608px) 560px, 100vw";
/** Space between the photo and the zoom pane beside it. */
const PANE_GAP = 32;
/** The floating nav's shadow: the zoom pane floats over the details beside the photo. */
const floating = "shadow-[0_4px_6px_rgba(0,0,0,0.3),0_16px_40px_rgba(0,0,0,0.55)]";

const clampIndex = (index: number, count: number) => Math.min(Math.max(index, 0), Math.max(count - 1, 0));

/** Desktop switches photos at once (thumbnails are hovered); phones glide, unless motion is reduced. */
function instantScroll(): boolean {
  return matchMedia("(prefers-reduced-motion: reduce)").matches || matchMedia("(hover: hover) and (pointer: fine)").matches;
}

/**
 * Daraz-style hover zoom, for a mouse on wide screens: a lens follows the pointer over the
 * photo and a pane beside it shows what's under the lens from the biggest file the photo has
 * (the 1920px zoom size for product uploads). Drawn straight onto the elements once a frame,
 * so moving the mouse never re-renders React.
 */
function useHoverZoom(track: RefObject<HTMLDivElement | null>, image: ProductImage | undefined) {
  const lens = useRef<HTMLDivElement>(null);
  const pane = useRef<HTMLDivElement>(null);
  const zoomed = useRef<HTMLImageElement>(null);
  const live = useRef({ enabled: false, frame: 0, x: 0, y: 0, image });

  useEffect(() => {
    live.current.image = image;
  }, [image]);

  const hide = useCallback(() => {
    cancelAnimationFrame(live.current.frame);
    live.current.frame = 0;
    if (lens.current) lens.current.style.visibility = "hidden";
    if (pane.current) pane.current.style.visibility = "hidden";
  }, []);

  const draw = useCallback(() => {
    const state = live.current;
    state.frame = 0;
    const el = track.current;
    const photo = state.image;
    if (!state.enabled || !el || !photo || !lens.current || !pane.current || !zoomed.current) return;

    // Where the photo is drawn in the frame (object-contain), and the pointer over it.
    const drawn = containRect(el.clientWidth, el.clientHeight, photo.width, photo.height);
    const file = largestPhoto(photo);
    const factor = zoomFactor(drawn.width, file.width);
    const box = el.getBoundingClientRect();
    const x = state.x - box.left - el.clientLeft - drawn.x;
    const y = state.y - box.top - el.clientTop - drawn.y;
    if (factor === null || x < 0 || y < 0 || x > drawn.width || y > drawn.height) return hide();

    const at = lensAt(x, y, drawn, factor);
    const left = el.offsetLeft + el.clientLeft + drawn.x;
    const top = el.offsetTop + el.clientTop + drawn.y;
    const img = zoomed.current;
    if (img.dataset.src !== file.src) {
      img.dataset.src = file.src;
      img.style.backgroundImage = `url("${photo.blurDataURL}")`;
      img.src = file.src;
    }
    Object.assign(lens.current.style, { visibility: "visible", left: `${left + at.x}px`, top: `${top + at.y}px`, width: `${at.width}px`, height: `${at.height}px` });
    Object.assign(pane.current.style, {
      visibility: "visible",
      left: `${el.offsetLeft + el.offsetWidth + PANE_GAP}px`,
      top: `${top}px`,
      width: `${drawn.width}px`,
      height: `${drawn.height}px`,
    });
    Object.assign(img.style, { width: `${drawn.width * factor}px`, height: `${drawn.height * factor}px`, transform: `translate3d(${at.offsetX}px, ${at.offsetY}px, 0)` });
  }, [hide, track]);

  useEffect(() => {
    const query = matchMedia("(min-width: 1024px) and (hover: hover) and (pointer: fine)");
    const update = () => {
      live.current.enabled = query.matches;
      if (!query.matches) hide();
    };
    update();
    query.addEventListener("change", update);
    // The page scrolled under a resting pointer: the photo moved, so the lens follows it.
    const onScroll = () => {
      const state = live.current;
      if (state.enabled && !state.frame && lens.current?.style.visibility === "visible") state.frame = requestAnimationFrame(draw);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      query.removeEventListener("change", update);
      window.removeEventListener("scroll", onScroll);
      hide();
    };
  }, [draw, hide]);

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const state = live.current;
      if (!state.enabled || event.pointerType !== "mouse") return;
      state.x = event.clientX;
      state.y = event.clientY;
      if (!state.frame) state.frame = requestAnimationFrame(draw);
    },
    [draw],
  );

  return { lensRef: lens, paneRef: pane, zoomedRef: zoomed, onPointerMove, onPointerLeave: hide };
}

/**
 * The product's photos, Daraz-like in Sunrise's frame: one swipeable strip (scroll snap)
 * that shows a photo at a time, with thumbnails under it (from sm), a "2 / 5" counter (below
 * lg), the hover zoom (mouse, lg+) and a tap or click to see the photos full screen. The
 * photo on show is shared with the options beside it, so choosing a variant shows its photo.
 */
export function ProductGallery({ images, name }: { images: ProductImage[]; name: string }) {
  const { imageIndex, showImage } = usePhotoOnShow();
  const count = images.length;
  const active = clampIndex(imageIndex, count);
  const track = useRef<HTMLDivElement>(null);
  /** The photo a scroll we started is heading to; the photos it passes on the way don't count. */
  const heading = useRef<number | null>(null);
  const [viewer, setViewer] = useState<number | null>(null);
  const { lensRef, paneRef, zoomedRef, onPointerMove, onPointerLeave } = useHoverZoom(track, images[active]);

  // Something else chose the photo (a thumbnail, a variant): bring it into view.
  useEffect(() => {
    const el = track.current;
    if (!el || el.clientWidth === 0 || Math.round(el.scrollLeft / el.clientWidth) === active) return;
    heading.current = active;
    // If a swipe interrupts the scroll, settle on wherever the strip stopped.
    const timer = window.setTimeout(() => {
      heading.current = null;
      if (el.clientWidth) showImage(clampIndex(Math.round(el.scrollLeft / el.clientWidth), count));
    }, 900);
    el.scrollTo({ left: active * el.clientWidth, behavior: instantScroll() ? "instant" : "smooth" });
    return () => window.clearTimeout(timer);
  }, [active, count, showImage]);

  // A swipe (or a sideways trackpad scroll) chooses the photo too.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (el.clientWidth === 0) return;
        const index = clampIndex(Math.round(el.scrollLeft / el.clientWidth), count);
        if (heading.current !== null) {
          if (index !== heading.current) return;
          heading.current = null;
        }
        showImage(index);
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [count, showImage]);

  if (count === 0) {
    return (
      <div className="mx-auto flex aspect-square w-full max-w-[560px] items-center justify-center rounded-card border border-line bg-surface text-sm text-muted lg:max-w-none">
        No photo yet
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[560px] lg:max-w-none">
      <div className="relative">
        <div
          ref={track}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          className="flex aspect-square snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-card border border-line bg-raised [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((image, index) => (
            <button
              key={`${index}-${image.src}`}
              type="button"
              tabIndex={index === active ? 0 : -1}
              onClick={() => {
                onPointerLeave();
                setViewer(index);
              }}
              className="relative h-full w-full shrink-0 cursor-zoom-in snap-center snap-always rounded-[7px] outline-offset-[-3px]"
            >
              <Image
                src={image.src}
                alt={image.alt || name}
                width={image.width}
                height={image.height}
                sizes={SIZES}
                preload={index === 0}
                placeholder="blur"
                blurDataURL={image.blurDataURL}
                draggable={false}
                className="h-full w-full object-contain"
              />
              {/* The photo's own description names the button; this says what it does. */}
              <span className="sr-only">{count > 1 ? ` (photo ${index + 1} of ${count}): see it full screen` : ": see it full screen"}</span>
            </button>
          ))}
        </div>

        {count > 1 && (
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-3 right-3 rounded-full border border-line-strong bg-background/85 px-2.5 py-1 font-mono text-[11px] tracking-[0.12em] text-foreground lg:hidden"
          >
            {active + 1} / {count}
          </span>
        )}

        {/* The hover zoom (mouse, lg+): placed and shown by useHoverZoom while the photo is pointed at. */}
        <div ref={lensRef} aria-hidden className="pointer-events-none invisible absolute hidden border border-primary/80 bg-primary/10 lg:block" />
        <div
          ref={paneRef}
          aria-hidden
          className={`pointer-events-none invisible absolute z-20 hidden overflow-hidden rounded-card border border-line-strong bg-raised lg:block ${floating}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- the 1920px zoom size, set on first hover; next/image's loader stops at 1280 */}
          <img ref={zoomedRef} alt="" decoding="async" className="absolute left-0 top-0 max-w-none bg-cover will-change-transform" />
        </div>
      </div>

      {count > 1 && (
        <ul aria-label="Photos" className="mt-3 hidden gap-2 overflow-x-auto pb-1 [scrollbar-width:thin] sm:flex">
          {images.map((image, index) => (
            <li key={`${index}-${image.src}`} className="shrink-0">
              <button
                type="button"
                onClick={() => showImage(index)}
                onMouseEnter={() => showImage(index)}
                aria-label={`Show photo ${index + 1} of ${count}`}
                aria-current={index === active ? "true" : undefined}
                className={`block size-16 overflow-hidden rounded-control border-2 transition-colors duration-150 lg:size-[72px] ${
                  index === active ? "border-primary" : "border-line hover:border-line-strong"
                }`}
              >
                <Image src={image.src} alt="" width={image.width} height={image.height} sizes="80px" placeholder="blur" blurDataURL={image.blurDataURL} className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {viewer !== null && (
        <PhotoViewer
          images={images}
          name={name}
          start={viewer}
          onClose={(index) => {
            setViewer(null);
            showImage(index);
          }}
        />
      )}
    </div>
  );
}
