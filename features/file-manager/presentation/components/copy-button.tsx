"use client";

import { useEffect, useState } from "react";
import { Check, Link2 } from "lucide-react";
import { rowLinkClass } from "@/features/dashboard/presentation/components/ui";

const boxedClass =
  "inline-flex h-11 shrink-0 items-center gap-1.5 rounded-control border border-line-strong px-3 text-sm font-medium text-strong transition-colors duration-150 hover:border-primary hover:text-primary";

/**
 * Copies a link and says "Copied" for a moment (announced to screen readers too).
 * Where the clipboard is blocked, the link is offered in a prompt to copy by hand.
 */
export function CopyButton({ text, label = "Copy link", ariaLabel, boxed = false }: { text: string; label?: string; ariaLabel?: string; boxed?: boolean }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      window.prompt("Copy this link:", text);
    }
  }

  return (
    <>
      <button type="button" onClick={() => void copy()} aria-label={ariaLabel} className={boxed ? boxedClass : rowLinkClass}>
        {copied ? <Check className="h-4 w-4" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}
        {copied ? "Copied" : label}
      </button>
      <span role="status" className="sr-only">
        {copied ? "Link copied" : ""}
      </span>
    </>
  );
}
