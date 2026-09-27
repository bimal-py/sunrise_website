import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

/**
 * A scene's "View all …" link: gold, underlined text, centred at the bottom of
 * a scene. It carries an arrow when it stands alone. Between a carousel's
 * scroll arrows (desktop) it drops its own, so arrows there only ever mean
 * "scroll": pass `besideArrows` (the carousel shows no arrows below lg, so
 * the link keeps its arrow on phones).
 */
export function SceneLink({ href, besideArrows = false, children }: { href: string; besideArrows?: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2 py-1 text-sm font-medium text-primary transition-colors duration-150"
    >
      <span className="underline decoration-primary/40 underline-offset-[6px] group-hover:decoration-primary">{children}</span>
      <ArrowRight className={`h-4 w-4 ${besideArrows ? "lg:hidden" : ""}`} aria-hidden />
    </Link>
  );
}
