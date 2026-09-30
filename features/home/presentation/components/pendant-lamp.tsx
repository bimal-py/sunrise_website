"use client";

import { useEffect, useRef } from "react";
import { useLightSwitch } from "./scene-light";

/* The swing is a pendulum on a long cord (a period of about 2.4s), damped to
   a little over half of critical: it leans over, swings a touch past and
   settles. */
const stiffness = 6.9; // (2π / 2.4s)²
const damping = 2.9; // 2 × 0.55 × 2π / 2.4s
/** How far it leans toward the pointer: this share of the pointer's angle from the hook, never more than `reach` degrees. */
const lean = 0.7;
const reach = 22;
/** Pointed at a film, it turns all the way onto the film's still, up to this far. */
const reachFilm = 40;

/** The angle (degrees) that points the lamp from its hook at a point dx across and dy below it; clockwise turns swing the shade left, hence the sign. */
const toward = (dx: number, dy: number) => (-Math.atan2(dx, Math.max(dy, 60)) * 180) / Math.PI;
const clamp = (angle: number, limit: number) => Math.max(-limit, Math.min(limit, angle));

/**
 * "Now showing" is lit by a tungsten pendant lamp hanging over the title card:
 * a black bell shade on a cord from the ceiling, the bulb glowing in its mouth,
 * a cone of warm light on the wall below it, behind the film strip. With a
 * mouse, the lamp leans toward the pointer; pointed at a film, it turns to
 * aim its cone at the middle of that film's still; it swings back when the
 * pointer leaves. It moves as a pendulum (cord, shade and cone turn together
 * about the hook). Touch
 * screens and reduced motion get it hanging still. The light switches on as
 * the scene comes into view (useLightSwitch); globals.css "Scene lights".
 */
export function PendantLamp() {
  const layer = useRef<HTMLDivElement>(null);
  const lamp = useRef<HTMLDivElement>(null);
  useLightSwitch(layer);

  useEffect(() => {
    const body = lamp.current;
    const scene = layer.current?.closest("section");
    if (!body || !scene) return;
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let angle = 0;
    let velocity = 0;
    let target = 0;
    let frame = 0;
    let last = 0;
    const step = (now: number) => {
      const dt = Math.min(Math.max((now - last) / 1000, 0), 1 / 30);
      last = now;
      velocity += (stiffness * (target - angle) - damping * velocity) * dt;
      angle += velocity * dt;
      const settled = Math.abs(target - angle) < 0.01 && Math.abs(velocity) < 0.01;
      if (settled) angle = target;
      body.style.rotate = `${angle.toFixed(2)}deg`;
      frame = settled ? 0 : requestAnimationFrame(step);
    };
    const swing = (to: number) => {
      target = to;
      if (frame) return;
      last = performance.now();
      frame = requestAnimationFrame(step);
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      // The hook is at the top centre of the scene.
      const box = scene.getBoundingClientRect();
      const hookX = box.left + box.width / 2;
      const film = (event.target as Element).closest("[data-spot]");
      if (film) {
        const still = (film.querySelector("[data-spot-center]") ?? film).getBoundingClientRect();
        return swing(clamp(toward(still.left + still.width / 2 - hookX, still.top + still.height / 2 - box.top), reachFilm));
      }
      swing(clamp(toward(event.clientX - hookX, event.clientY - box.top) * lean, reach));
    };
    const onLeave = () => swing(0);
    scene.addEventListener("pointermove", onMove, { passive: true });
    scene.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      scene.removeEventListener("pointermove", onMove);
      scene.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div ref={layer} aria-hidden className="scene-light lamp-light pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div ref={lamp} className="lamp">
        <div className="lamp-halo lit" />
        <div className="lamp-beam lit" />
        <span className="lamp-cord" />
        <svg viewBox="0 0 56 42" className="lamp-shade">
          <defs>
            <radialGradient id="lamp-bulb" cx="50%" cy="35%" r="60%">
              <stop offset="0" stopColor="#fffaf0" />
              <stop offset="1" stopColor="#efc98a" />
            </radialGradient>
          </defs>
          <rect className="lamp-cap" x="23" y="0" width="10" height="9.5" rx="2" />
          <path className="lamp-body" d="M22 8H34C34 13 38 16 44 20 50 24 54.5 30 55.5 38H.5C1.5 30 6 24 12 20 18 16 22 13 22 8Z" />
          <path className="lamp-sheen" d="M11 21.5C6.5 25 3.8 30 3 36" />
          <ellipse className="lamp-mouth" cx="28" cy="38" rx="27.5" ry="3" />
          <ellipse className="lit" cx="28" cy="38" rx="26" ry="2.4" fill="url(#lamp-bulb)" />
        </svg>
      </div>
    </div>
  );
}
