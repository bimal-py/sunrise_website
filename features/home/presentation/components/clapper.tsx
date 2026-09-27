"use client";

import { useEffect, useRef } from "react";

/**
 * The slate's top stick. It rests closed, and every time the slate comes into
 * view it plays one quick open-and-clap (globals.css `slate-clap`), so each
 * visit gets its clap but the stick is never left hanging open over the page.
 * Leaving the screen re-arms it. Reduced motion: it just stays closed.
 */
export function Clapper() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer = 0;
    let armed = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= 0.6 && armed) {
          armed = false;
          window.clearTimeout(timer);
          timer = window.setTimeout(() => el.classList.add("is-clapping"), 200);
        } else if (!entry.isIntersecting) {
          armed = true; // off screen: ready to clap again on the next visit
          el.classList.remove("is-clapping");
        }
      },
      { threshold: [0, 0.6] },
    );
    observer.observe(el);
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  return <div ref={ref} aria-hidden className="slate-clapper slate-stripes h-10 rounded-t-[3px] sm:h-12" />;
}
