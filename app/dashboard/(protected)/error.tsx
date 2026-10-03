"use client";

import { routes } from "@/lib/routes";
import { DashboardButton } from "@/features/dashboard/presentation/components/ui/dashboard-button";
import { eyebrowClass } from "@/features/dashboard/presentation/components/ui/dashboard-ui";
import { SpriteButton } from "@/shared/components/ui/sprite-button";

/**
 * A dashboard page or action that failed (a delete that threw, an expired session, a query
 * error). The frame above (the header card and its tabs) stays, so the way out is still there.
 * React already logs the error; in production its message is withheld, so the reference
 * (digest) is what matches it to the server's log.
 */
export default function DashboardError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="rounded-panel border border-line bg-surface px-6 py-12 text-center sm:px-8">
      <p className={eyebrowClass}>Something went wrong</p>
      <h1 className="mt-3 font-display text-3xl font-semibold leading-tight text-strong sm:text-4xl">This didn&apos;t finish.</h1>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted">
        The last change may not have been saved. Try again; if it keeps failing, sign out and back in (the session may have ended).
      </p>
      {process.env.NODE_ENV !== "production" && error.message ? <p className="mx-auto mt-3 max-w-xl break-words font-mono text-xs text-error">{error.message}</p> : null}
      {error.digest ? <p className="mt-3 font-mono text-xs text-muted">Reference: {error.digest}</p> : null}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <SpriteButton type="button" onClick={retry}>
          Try again
        </SpriteButton>
        <DashboardButton href={routes.dashboard()}>Go to the overview</DashboardButton>
      </div>
    </div>
  );
}
