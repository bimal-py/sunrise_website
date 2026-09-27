import type { ReactNode } from "react";

type Tone = "primary" | "neutral";

const tones: Record<Tone, string> = {
  primary: "bg-primary-soft text-primary",
  neutral: "border border-line-strong text-muted",
};

/** Small status chip (film category, blog tag). The only pill shape besides the nav. */
export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}
