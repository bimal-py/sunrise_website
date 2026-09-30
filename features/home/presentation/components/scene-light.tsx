"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";

/**
 * Switches a scene's light on as its scene (the enclosing <section>) comes
 * into view, and off once the scene has gone, so coming back turns it on
 * again. It toggles `is-off` on the light; the parts marked `.lit` fade with it
 * (globals.css "Scene lights"). Before this runs, and without JavaScript, the
 * light is simply on.
 */
export function useLightSwitch(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const light = ref.current;
    const scene = light?.closest("section") ?? light;
    if (!light || !scene) return;
    // On once the scene's top is a third of the way up the screen.
    const observer = new IntersectionObserver(([entry]) => light.classList.toggle("is-off", !entry.isIntersecting), {
      rootMargin: "0px 0px -30% 0px",
    });
    observer.observe(scene);
    return () => observer.disconnect();
  }, [ref]);
}

/** A light in a home scene: its markup (server-rendered children) switched on and off with the scene. */
export function SceneLight({ className = "", children }: { className?: string; children?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLightSwitch(ref);
  return (
    <div ref={ref} aria-hidden className={`scene-light pointer-events-none ${className}`}>
      {children}
    </div>
  );
}
