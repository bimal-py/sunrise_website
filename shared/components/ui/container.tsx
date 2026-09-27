import type { ReactNode } from "react";

/**
 * The one content container: max 1280px, 16/24/32px gutters. Every section,
 * the header and the footer align to it. `narrow` (1152px) is for reading pages.
 */
export function Container({ children, narrow = false, className = "" }: { children: ReactNode; narrow?: boolean; className?: string }) {
  return <div className={`mx-auto w-full ${narrow ? "max-w-6xl" : "max-w-7xl"} px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}
