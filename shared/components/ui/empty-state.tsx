import type { ReactNode } from "react";

/** No-results / coming-soon message. Plain bordered block, centred text. */
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-card border border-line bg-surface px-6 py-12 text-center">
      <p className="text-lg font-semibold text-strong">{title}</p>
      {children && <div className="max-w-md text-sm text-muted">{children}</div>}
    </div>
  );
}
