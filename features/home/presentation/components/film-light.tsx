"use client";

import { useEffect, useRef } from "react";
import { useLightSwitch } from "./scene-light";

/** Where the light aims in a row without a still: this far across it, on the subject and notes rather than the number. */
const across = 0.65;
/** How far it can tilt below level, in degrees (the yoke's range). */
const lowest = 12;
const steepest = 62;

/**
 * "The shot list" is lit by a studio film light: a Fresnel head in a yoke,
 * hung from the grid on a drop rod, upper left of the title card. Its two
 * barn doors cut the beam into a hard-edged wedge that falls across the list
 * behind the rows. At rest it's aimed into the list; with a mouse it tilts on
 * its yoke to centre the beam on the still of the row you point at, as a
 * gaffer would. The light
 * switches on as the scene comes into view (useLightSwitch); globals.css
 * "Scene lights".
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

    const aimAt = (x: number, y: number) => {
      const from = hub.getBoundingClientRect();
      const angle = (Math.atan2(y - from.top, x - from.left) * 180) / Math.PI;
      tilt.style.rotate = `${Math.min(steepest, Math.max(lowest, angle)).toFixed(1)}deg`;
    };
    // At rest: into the list, near its top (on phones the list runs long).
    const rest = () => {
      const box = list.getBoundingClientRect();
      aimAt(box.left + box.width * across, box.top + Math.min(box.height * 0.35, 260));
    };
    rest();

    let current: Element | null = null;
    const onOver = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const row = (event.target as Element).closest("[data-shot]");
      if (row === current) return;
      current = row;
      if (!row) return rest();
      // Onto the row's still (it develops as the beam lands); a row without one, across its notes.
      const still = row.querySelector("[data-spot-center]")?.getBoundingClientRect();
      if (still) return aimAt(still.left + still.width / 2, still.top + still.height / 2);
      const box = row.getBoundingClientRect();
      aimAt(box.left + box.width * across, box.top + box.height / 2);
    };
    const onLeave = () => {
      current = null;
      rest();
    };
    scene.addEventListener("pointerover", onOver);
    scene.addEventListener("pointerleave", onLeave);
    window.addEventListener("resize", rest);
    return () => {
      scene.removeEventListener("pointerover", onOver);
      scene.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", rest);
    };
  }, []);

  return (
    <div ref={layer} aria-hidden className="scene-light film-light pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <span className="film-light-rod" />
      <span ref={pivot} className="film-light-pivot">
        {/* The head turns about the yoke's pivot; the beam turns with it. */}
        <div ref={head} className="film-light-head">
          <div className="film-light-beam lit" />
          <svg viewBox="-32 -34 88 68" className="film-light-housing">
            {/* Barn doors: top and bottom leaves, hinged on the front ring, closed down to 8° off the axis. */}
            <path className="film-light-leaf" d="M30.5-18.5 52-21.5M30.5 18.5 52 21.5" />
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
