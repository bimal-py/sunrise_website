import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

/** "All services →" style link beside a section heading. */
export function ViewAllLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 py-1 text-sm font-medium text-primary underline-offset-4 hover:underline">
      {children} <ArrowRight className="h-4 w-4" aria-hidden />
    </Link>
  );
}
