import type { ReactNode } from "react";

/**
 * The home page is told as a short film: each section is a numbered scene,
 * and its heading is a centred title card, matching the centred hero: mono
 * "Scene 02" between two short gold rules (like a slate), the title in the
 * display serif, a one-line lede. Links to a section's page sit centred at
 * the bottom of the scene, not beside the title.
 */
export function SceneHeading({ scene, title, lede, id }: { scene: number; title: ReactNode; lede?: ReactNode; id: string }) {
  return (
    <div className="mx-auto mb-12 max-w-2xl text-center lg:mb-14">
      <p className="flex items-center justify-center gap-3 font-mono text-[11px] uppercase tracking-[0.25em] text-muted">
        <span aria-hidden className="h-px w-8 bg-primary" />
        <span>Scene {String(scene).padStart(2, "0")}</span>
        <span aria-hidden className="h-px w-8 bg-primary" />
      </p>
      <h2 id={id} className="mt-4 text-[38px] leading-[1.05] sm:text-[52px]">
        {title}
      </h2>
      {lede && <p className="mx-auto mt-3 max-w-xl text-base text-muted">{lede}</p>}
    </div>
  );
}
