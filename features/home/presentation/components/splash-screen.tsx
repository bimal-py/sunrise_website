"use client";

import { useLayoutEffect, useRef } from "react";
import { SunriseMark } from "@/shared/components/brand/sunrise-mark";

/** When the shutter fires: the drawing, focus lock and counter are done (globals.css "Splash" timeline). */
const SHUTTER_AT = 2350;
/** Shutter fully closed; the viewfinder is swapped out while the screen is black. */
const SHUTTER_CLOSED = 130;
/** Shutter open again: the sun alone on black, ready to glide. */
const SHUTTER_OPEN = 320;
/** Length of the glide onto the hero mark; matches `.splash-mark` / `.splash-handover` transitions. */
const HANDOVER_MS = 850;
/** Into the glide, when the hero's text starts fading in (`.hero-reveal`). */
const REVEAL_AFTER = 450;

/** Module state lives as long as the loaded document: reset by every reload, kept across client navigation. */
let playedThisPageLoad = false;

/** True when the browser loaded this very page (typed URL, reload, a link from Google), not a click inside the site. */
function isEntryPage(): boolean {
  const entry = performance.getEntriesByType("navigation")[0];
  return !entry || new URL(entry.name).pathname === location.pathname;
}

const corner = "absolute h-6 w-6 border-strong/60 md:h-8 md:w-8";
const afCorner = "absolute h-4 w-4 border-current sm:h-5 sm:w-5";

/**
 * Intro over the home page: a look through the studio's camera at a sunrise.
 *
 *  1. A viewfinder: frame corners, the rule-of-thirds grid and exposure readouts.
 *  2. The sunrise draws (horizon, the sun rising, rays) while autofocus
 *     brackets hunt in and out, then lock and turn gold; the name appears and a
 *     "Capturing" counter runs to 100.
 *  3. The shutter fires: black curtains snap shut and open again, and the
 *     viewfinder is gone: just the sun, which glides and shrinks onto the small
 *     sun at the top of the hero (FLIP transform, measured at that moment) while
 *     the hero's text (`.hero-reveal`) fades in. If the hero mark isn't on
 *     screen (a reload restored a scrolled position), it fades instead.
 *
 * Steps 1–2 are CSS keyframes on server-rendered markup (globals.css "Splash"),
 * so they appear on the very first paint. Without JavaScript the CSS fades the
 * splash out on its own; with it (`splash-js`) this component runs step 3. The
 * page is rendered underneath the whole time, so the splash never delays
 * content or SEO.
 *
 * Plays on every full load of the home page; clicking Home from another page
 * doesn't replay it. A tap or key press skips it. Reduced motion hides it in CSS.
 */
export function SplashScreen({ heroMarkSelector, tagline, signature }: { heroMarkSelector: string; tagline: string; signature: string }) {
  const ref = useRef<HTMLDivElement>(null);
  // Decided once per mount: React dev (Strict Mode) runs effects twice, and the
  // second run would otherwise see playedThisPageLoad set by the first.
  const play = useRef<boolean | null>(null);

  // Layout effect: runs before the browser paints, so clicking Home from another
  // page never flashes the splash.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement;
    if (play.current === null) {
      play.current = !playedThisPageLoad && isEntryPage() && !matchMedia("(prefers-reduced-motion: reduce)").matches;
      playedThisPageLoad = true;
    }
    if (!play.current) {
      el.hidden = true;
      return;
    }

    // The CSS timeline has been running since first paint; on a slow connection this
    // script can arrive late. Sync to it (never restart it), and if the CSS fallback
    // has already reached its ending, let it finish on its own.
    // The CSS keyframes started when the server-rendered splash was first painted.
    const firstPaint = performance.getEntriesByName("first-contentful-paint")[0]?.startTime;
    const elapsed = firstPaint === undefined ? 0 : Math.max(0, performance.now() - firstPaint);
    if (elapsed >= SHUTTER_AT - 100) {
      const timer = window.setTimeout(() => (el.hidden = true), Math.max(0, 2900 - elapsed));
      return () => window.clearTimeout(timer);
    }

    // splash-active: locks scroll and hides the hero mark and text until the hand-over.
    root.classList.add("splash-active");
    el.classList.add("splash-js"); // this component runs the ending, not the CSS fallback
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));
    let ended = false;

    const remove = () => {
      el.hidden = true;
      root.classList.remove("splash-active", "splash-revealing");
    };

    const fadeOut = (ms: number) => {
      ended = true;
      el.style.setProperty("--splash-out", `${ms}ms`);
      el.classList.add("splash-fading");
      later(remove, ms);
    };

    const glide = () => {
      const mark = el.querySelector<SVGSVGElement>(".splash-mark");
      const target = document.querySelector<SVGSVGElement>(heroMarkSelector);
      const to = target?.getBoundingClientRect();
      const onScreen = to && to.width > 0 && to.top >= 0 && to.bottom <= window.innerHeight;
      if (!mark || !target || !to || !onScreen) return fadeOut(500);

      const from = mark.getBoundingClientRect();
      const scale = to.width / from.width;
      const dx = to.left + to.width / 2 - (from.left + from.width / 2);
      const dy = to.top + to.height / 2 - (from.top + from.height / 2);
      el.classList.add("splash-handover");
      mark.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
      // Thicken the lines as they shrink, so the last frame matches the hero mark exactly.
      const strokes = mark.querySelector<SVGGElement>(".sunrise-strokes");
      const targetStroke = target.querySelector(".sunrise-strokes")?.getAttribute("stroke-width");
      if (strokes && targetStroke) strokes.style.strokeWidth = targetStroke;
      later(() => root.classList.add("splash-revealing"), REVEAL_AFTER);
      later(remove, HANDOVER_MS);
    };

    const fireShutter = () => {
      if (ended) return;
      ended = true;
      el.classList.add("splash-shutter"); // curtains close and reopen (globals.css)
      later(() => el.classList.add("splash-captured"), SHUTTER_CLOSED); // viewfinder gone while it's black
      later(glide, SHUTTER_OPEN);
    };

    later(fireShutter, SHUTTER_AT - elapsed);
    const skip = () => {
      if (!ended) fadeOut(250);
    };
    el.addEventListener("pointerdown", skip);
    window.addEventListener("keydown", skip);
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      el.removeEventListener("pointerdown", skip);
      window.removeEventListener("keydown", skip);
      root.classList.remove("splash-active", "splash-revealing");
    };
  }, [heroMarkSelector]);

  return (
    <div ref={ref} className="splash fixed inset-0 z-[100] overflow-hidden" aria-hidden>
      {/* The backdrop is its own layer so it can fade while the sun stays. */}
      <div className="splash-backdrop absolute inset-0 bg-background" />

      {/* ── Viewfinder: gone the moment the shutter closes ── */}
      <div className="splash-viewfinder absolute inset-0">
        {/* Rule-of-thirds grid */}
        <span className="splash-grid-h absolute inset-x-0 top-1/3 h-px bg-strong/10" />
        <span className="splash-grid-h absolute inset-x-0 top-2/3 h-px bg-strong/10" style={{ ["--d" as string]: "80ms" }} />
        <span className="splash-grid-v absolute inset-y-0 left-1/3 w-px bg-strong/10" style={{ ["--d" as string]: "40ms" }} />
        <span className="splash-grid-v absolute inset-y-0 left-2/3 w-px bg-strong/10" style={{ ["--d" as string]: "120ms" }} />

        {/* Frame corners */}
        <div className="splash-frame absolute inset-5 md:inset-10">
          <span className={`${corner} left-0 top-0 border-l border-t`} />
          <span className={`${corner} right-0 top-0 border-r border-t`} />
          <span className={`${corner} bottom-0 left-0 border-b border-l`} />
          <span className={`${corner} bottom-0 right-0 border-b border-r`} />
        </div>

        {/* Exposure readouts */}
        <div
          className="splash-fade absolute inset-x-8 top-8 flex justify-between font-mono text-[11px] tracking-[0.08em] text-muted md:inset-x-16 md:top-16 md:text-xs"
          style={{ ["--d" as string]: "300ms" }}
        >
          <span>
            AF-S<span className="mx-2 text-strong/30">·</span>f/2.8<span className="mx-2 text-strong/30">·</span>1/250
            <span className="mx-2 text-strong/30">·</span>ISO 100
          </span>
          <span className="text-strong">RAW</span>
        </div>

        <p
          className="splash-fade absolute inset-x-8 bottom-[15%] text-center font-mono text-xs text-foreground md:bottom-[14%]"
          style={{ ["--d" as string]: "1000ms" }}
        >
          {/[.!?]$/.test(tagline) ? tagline : `${tagline}.`}
        </p>
      </div>

      {/* Status row: the counter runs while the camera is "capturing"; gone with the viewfinder when the shutter closes. */}
      <div className="splash-viewfinder absolute inset-x-8 bottom-8 flex justify-between font-mono text-[11px] text-muted md:inset-x-16 md:bottom-16 md:text-xs">
        <span>{signature}</span>
        <span>
          Capturing <span className="splash-count tabular-nums text-strong" />
        </span>
      </div>

      {/* ── The subject: the sun (stays through the shutter) and the name (goes with the viewfinder) ── */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-5">
        <div className="relative">
          <SunriseMark id="splash" animated strokeWidth={3} className="splash-mark w-[min(64vw,300px)] lg:w-[380px]" />
          {/* Autofocus brackets: hunt, then lock on the sun and turn gold */}
          <div className="splash-viewfinder pointer-events-none absolute -inset-x-[6%] -bottom-[4%] -top-[12%]">
            <div className="splash-af absolute inset-0 text-strong/70">
              <span className={`${afCorner} left-0 top-0 border-l-2 border-t-2`} />
              <span className={`${afCorner} right-0 top-0 border-r-2 border-t-2`} />
              <span className={`${afCorner} bottom-0 left-0 border-b-2 border-l-2`} />
              <span className={`${afCorner} bottom-0 right-0 border-b-2 border-r-2`} />
            </div>
          </div>
        </div>
        <div className="splash-viewfinder text-center">
          <p className="splash-fade mt-8 font-display text-[44px] leading-none text-strong sm:text-[56px]" style={{ ["--d" as string]: "1300ms" }}>
            Sunrise
          </p>
          <p className="splash-fade mt-3 font-mono text-[11px] uppercase tracking-[0.4em] text-primary" style={{ ["--d" as string]: "1450ms" }}>
            Photo Studio
          </p>
        </div>
      </div>

      {/* ── Shutter curtains (closed only for a moment when the photo is taken) ── */}
      <span className="splash-curtain splash-curtain-top absolute inset-x-0 top-0 h-1/2 bg-black" />
      <span className="splash-curtain splash-curtain-bottom absolute inset-x-0 bottom-0 h-1/2 bg-black" />
    </div>
  );
}
