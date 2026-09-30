"use client";

import { useEffect, useRef } from "react";
import { useLightSwitch } from "./scene-light";

/** Where the light aims in a row without a still: this far across it, on the subject and notes rather than the number. */
const across = 0.65;
/** How far it can tilt below level, in degrees (the yoke's range). */
const lowest = 5;
const steepest = 62;

/**
 * "The shot list" is lit by a studio film light: a Fresnel head in a yoke,
 * hung from the grid on a drop rod, upper left of the title card; desktop
 * only (lg+: on phones and tablets the scene is a storyboard, unlit). Its barn
 * doors cut the beam to a narrow hard-edged shaft. At rest it rakes across the
 * list and fades out; with a mouse it tilts on its yoke onto the row you point
 * at, the shaft ends where the light lands and a focused, soft pool of light
 * sits centred on that row's still (across a row without one), as a gaffer
 * puts a light on a subject. It finds the row under the pointer from the
 * rows' own boxes on every move and scroll, so it never points at a row
 * you've left and nothing laid over the page can confuse it. The light switches on as the scene
 * comes into view (useLightSwitch); globals.css "Scene lights".
 */
export function FilmLight() {
  const layer = useRef<HTMLDivElement>(null);
  const pivot = useRef<HTMLSpanElement>(null);
  const head = useRef<HTMLDivElement>(null);
  useLightSwitch(layer);

  useEffect(() => {
    const scene = layer.current?.closest("section");
    const hub = pivot.current;
    const tilt = head.current;
    const list = scene?.querySelector<HTMLElement>("[data-shot-list]");
    if (!scene || !hub || !tilt || !list) return;

    const aimAt = (x: number, y: number, pool: boolean) => {
      const from = hub.getBoundingClientRect();
      const dx = x - from.left;
      const dy = y - from.top;
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      tilt.style.rotate = `${Math.min(steepest, Math.max(lowest, angle)).toFixed(2)}deg`;
      // The shaft ends where the light lands.
      if (pool) tilt.style.setProperty("--throw", `${Math.hypot(dx, dy).toFixed(1)}px`);
      else tilt.style.removeProperty("--throw");
      tilt.classList.toggle("is-aimed", pool);
    };
    // At rest: raking into the list, near its top.
    const rest = () => {
      const box = list.getBoundingClientRect();
      aimAt(box.left + box.width * across, box.top + Math.min(box.height * 0.35, 260), false);
    };
    rest();

    // The pointer's last position in the scene; each frame the light goes to the row under it, found from
    // the rows' own boxes (nothing laid over the page can confuse it).
    let pointer: { x: number; y: number } | null = null;
    let frame = 0;
    const rowAt = (x: number, y: number) =>
      Array.from(list.querySelectorAll<HTMLElement>("[data-shot]")).find((row) => {
        const box = row.getBoundingClientRect();
        return x >= box.left && x < box.right && y >= box.top && y < box.bottom;
      });
    const update = () => {
      frame = 0;
      const row = pointer ? rowAt(pointer.x, pointer.y) : undefined;
      if (!row) return rest();
      // Onto the middle of the row's still (it develops as the light lands); a row without one, across its notes.
      const still = row.querySelector("[data-spot-center]")?.getBoundingClientRect();
      if (still) return aimAt(still.left + still.width / 2, still.top + still.height / 2, true);
      const box = row.getBoundingClientRect();
      aimAt(box.left + box.width * across, box.top + box.height / 2, true);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      pointer = { x: event.clientX, y: event.clientY };
      schedule();
    };
    const onScroll = () => {
      if (pointer) schedule();
    };
    const onLeave = () => {
      pointer = null;
      schedule();
    };
    scene.addEventListener("pointermove", onPointer, { passive: true });
    scene.addEventListener("pointerover", onPointer, { passive: true });
    scene.addEventListener("pointerleave", onLeave);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      scene.removeEventListener("pointermove", onPointer);
      scene.removeEventListener("pointerover", onPointer);
      scene.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <div ref={layer} aria-hidden className="scene-light film-light pointer-events-none absolute inset-0 -z-10 hidden overflow-hidden lg:block">
      <span className="film-light-rod" />
      <span ref={pivot} className="film-light-pivot">
        {/* The head turns about the yoke's pivot; the shaft and the pool turn with it. */}
        <div ref={head} className="film-light-head">
          <div className="film-light-beam lit" />
          <div className="film-light-glow lit">
            <div className="film-light-pool" />
          </div>
          <svg viewBox="-32 -34 88 68" className="film-light-housing">
            {/* Barn doors: top and bottom leaves, hinged on the front ring, closed down to 5.5° off the axis. */}
            <path className="film-light-leaf" d="M30.5-18.5 52-20.6M30.5 18.5 52 20.6" />
            <path className="film-light-body" d="M24-16H-22Q-30-16-30-8V8Q-30 16-22 16H24Z" />
            {[-21, -15, -9, -3].map((x) => (
              <rect key={x} className="film-light-vent" x={x} y="-12" width="2.2" height="8" rx="1" />
            ))}
            <rect className="film-light-knob" x="-25" y="15.5" width="6" height="4" rx="1" />
            <rect className="film-light-ring" x="24" y="-19" width="6" height="38" rx="1.5" />
            <ellipse className="film-light-lens" cx="30.5" cy="0" rx="2.2" ry="14.5" />
            <ellipse className="lit" cx="30.5" cy="0" rx="2" ry="14" fill="#fff6e6" />
          </svg>
        </div>
        {/* The yoke's near arm and its tilt lock, in front of the head; it doesn't turn. */}
        <svg viewBox="-8 -42 16 50" className="film-light-yoke">
          <rect className="film-light-clamp" x="-6" y="-41" width="12" height="6" rx="1.5" />
          <rect className="film-light-arm" x="-2.5" y="-37" width="5" height="37" rx="1.5" />
          <circle className="film-light-lock" cx="0" cy="0" r="5.5" />
          <circle className="film-light-lock-core" cx="0" cy="0" r="2" />
        </svg>
      </span>
    </div>
  );
}
