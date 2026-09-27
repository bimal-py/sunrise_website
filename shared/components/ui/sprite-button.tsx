"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";

/** Frames in /brand/ink-sprite.webp (brush-stroke masks, fully painted → empty). */
const FRAMES = 22;

type SpriteButtonProps = {
  /**
   * primary: solid gold at rest; on hover the gold ink brushes away to a gold outline.
   * secondary: gold outline at rest; on hover autofocus brackets lock onto the corners.
   */
  variant?: "primary" | "secondary";
  /** Link target. Internal paths use next/link; http(s), mailto: and tel: use a plain <a>. */
  href?: string;
  /** Renders a real <button> instead of a link (form submits, actions). */
  type?: "button" | "submit";
  onClick?: () => void;
  /** Open in a new tab. Defaults to true for http(s) links (WhatsApp, YouTube). */
  newTab?: boolean;
  /** Layout only (margins, `w-full`, `shrink-0`, radius); the look is fixed. */
  className?: string;
  children: ReactNode;
};

/**
 * The site's button, in two variants:
 *
 * - primary: the owner's portfolio "SpriteButton" in gold. A brush-stroke
 *   sprite masks the gold fill layer; hovering (or keyboard focus) brushes the
 *   gold away to an outline, leaving paints it back. The mask snaps to whole
 *   frames and eases one continuous value, so rapid hovering never flickers.
 * - secondary: a gold outline; on hover/focus four gold corner brackets snap
 *   onto it, like the splash's autofocus locking onto the sun (CSS only).
 *
 * Touch screens and reduced motion get the resting look. Styles: `.sprite-btn`
 * in globals.css.
 */
export function SpriteButton({ variant = "primary", href, type, onClick, newTab, className = "", children }: SpriteButtonProps) {
  const fillRef = useRef<HTMLSpanElement>(null);
  const progress = useRef(1); // 1 = fully painted (the primary button's resting state)
  const target = useRef(1);
  const raf = useRef(0);

  const apply = (p: number) => {
    const frame = Math.round((1 - p) * FRAMES);
    fillRef.current?.style.setProperty("--ink", `${(frame / FRAMES) * 100}%`);
  };

  const tick = () => {
    const next = progress.current + (target.current - progress.current) * 0.14;
    progress.current = Math.abs(target.current - next) < 0.002 ? target.current : next;
    apply(progress.current);
    raf.current = progress.current === target.current ? 0 : requestAnimationFrame(tick);
  };

  const paint = (to: number) => {
    target.current = to;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      progress.current = to;
      return apply(to);
    }
    if (!raf.current) raf.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  // Only the primary button paints ink; the secondary one is pure CSS (focus brackets).
  const handlers =
    variant === "primary"
      ? {
          onMouseEnter: () => paint(0),
          onMouseLeave: () => paint(1),
          onFocus: () => paint(0),
          onBlur: () => paint(1),
        }
      : {};
  const classes = `sprite-btn sprite-btn-${variant} ${className}`;
  const inner =
    variant === "primary" ? (
      <>
        <span className="sprite-btn-label">{children}</span>
        <span className="sprite-btn-fill" aria-hidden ref={fillRef}>
          {children}
        </span>
      </>
    ) : (
      <>
        <span className="sprite-btn-label">{children}</span>
        {/* Autofocus brackets (like the splash): snap onto the corners on hover/focus. */}
        <span className="sprite-btn-af" aria-hidden>
          <i />
          <i />
          <i />
          <i />
        </span>
      </>
    );

  if (type || !href) {
    return (
      <button type={type ?? "button"} onClick={onClick} className={classes} {...handlers}>
        {inner}
      </button>
    );
  }

  if (href.startsWith("/") && !href.includes("#")) {
    return (
      <Link href={href} className={classes} {...handlers}>
        {inner}
      </Link>
    );
  }

  const openNew = newTab ?? /^https?:/.test(href);
  return (
    <a href={href} className={classes} {...(openNew ? { target: "_blank", rel: "noopener noreferrer" } : {})} {...handlers}>
      {inner}
    </a>
  );
}
