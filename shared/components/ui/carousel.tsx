"use client";

import { Children, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

/**
 * Horizontal scroller in the style of the owner's portfolio carousels: native
 * scrolling with snap points (swipe on phones, trackpad on laptops).
 *
 * Controls: one centred bar under the track. Desktop (lg+): ← [center] →,
 * where `center` is usually the section's "All …" link. Below lg: the dots
 * (a position indicator) with `center` under them; no arrows (you swipe).
 *
 * Full-bleed: the track runs edge to edge, but its first item lines up with
 * the page container (the padding/scroll-padding below match <Container>).
 * It rewinds to the start whenever it scrolls fully out of view, so coming
 * back to the section always shows it fresh (the last frame cut at the edge,
 * inviting a swipe). Items are server-rendered children; only the scrolling
 * state is client-side.
 */
export function Carousel({
  label,
  children,
  gap = "gap-5",
  center,
  className = "",
}: {
  /** Accessible name of the scroller ("Films", "Reviews"). */
  label: string;
  children: ReactNode;
  /** Tailwind gap between items (a film strip uses gap-0 so its frames join up). */
  gap?: string;
  /** Centred between the arrows (desktop) / under the dots (mobile): e.g. the "All films" link. */
  center?: ReactNode;
  className?: string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const count = Children.count(children);
  const [active, setActive] = useState(0);
  const [edges, setEdges] = useState({ start: true, end: false });

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const items = Array.from(el.children) as HTMLElement[];
      const left = el.getBoundingClientRect().left + parseFloat(getComputedStyle(el).scrollPaddingLeft || "0");
      let best = 0;
      let bestDistance = Infinity;
      items.forEach((item, index) => {
        const distance = Math.abs(item.getBoundingClientRect().left - left);
        if (distance < bestDistance) {
          best = index;
          bestDistance = distance;
        }
      });
      setActive(best);
      // A new object only when an edge actually changes, so scrolling doesn't re-render the carousel every frame.
      const start = el.scrollLeft < 4;
      const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      setEdges((edges) => (edges.start === start && edges.end === end ? edges : { start, end }));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    // Rewind while nobody can see it, so returning to the section starts from the first item.
    const rewind = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting && el.scrollLeft > 0) el.scrollTo({ left: 0, behavior: "instant" });
    });
    rewind.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      rewind.disconnect();
    };
  }, []);

  const scrollBy = (direction: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  };

  const arrow =
    "flex size-11 items-center justify-center rounded-full border border-line-strong text-strong transition-colors duration-150 hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-30";

  return (
    <div className={className}>
      <div
        ref={track}
        role="region"
        aria-roledescription="carousel"
        aria-label={label}
        tabIndex={0}
        className={`carousel-track flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${gap}`}
      >
        {children}
      </div>

      <div className="mt-8 flex flex-col items-center gap-5 px-4 lg:flex-row lg:justify-center lg:gap-8">
        {/* Dots below lg (position indicator only). */}
        <div className="flex gap-1.5 lg:hidden" aria-hidden>
          {Array.from({ length: count }, (_, index) => (
            <span
              key={index}
              className={`h-1.5 rounded-full transition-all duration-300 ${index === active ? "w-6 bg-primary" : "w-1.5 bg-line-strong"}`}
            />
          ))}
        </div>
        <button type="button" onClick={() => scrollBy(-1)} disabled={edges.start} aria-label={`Previous: ${label}`} className={`${arrow} hidden lg:flex`}>
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </button>
        {center}
        <button type="button" onClick={() => scrollBy(1)} disabled={edges.end} aria-label={`Next: ${label}`} className={`${arrow} hidden lg:flex`}>
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
        {/* The track is focusable and scrolls with the arrow keys; this announces the position. */}
        <span className="sr-only" aria-live="polite">
          {active + 1} of {count}
        </span>
      </div>
    </div>
  );
}
