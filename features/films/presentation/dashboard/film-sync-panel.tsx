"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { routes } from "@/lib/routes";
import { formatDateTime } from "@/lib/utils/date";
import { finishFilmSync, importFilmsBatch, startFilmSync, type FilmSyncItem, type FilmSyncStart } from "@/features/films/presentation/actions/films";
import { DashboardButton } from "@/features/dashboard/presentation/components/ui/dashboard-button";
import { fieldLabelClass, StatusBadge } from "@/features/dashboard/presentation/components/ui/dashboard-ui";
import { useProgressWhile } from "@/features/dashboard/presentation/components/ui/use-progress-while";
import { SpriteButton } from "@/shared/components/ui/sprite-button";

/** Uploads sent per call (the server takes at most 8). */
const BATCH = 8;

type Phase = "idle" | "checking" | "importing" | "done" | "stopped" | "error";
type Scope = Extract<FilmSyncStart, { ok: true }>;
type Tally = { total: number; processed: number; added: number; hidden: number; skipped: FilmSyncItem[]; failed: FilmSyncItem[] };

const EMPTY: Tally = { total: 0, processed: 0, added: 0, hidden: 0, skipped: [], failed: [] };
const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;
const watchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;

/**
 * "Sync from YouTube", built like the portfolio's dev.to sync panel: one card with what it
 * does, the last sync, a live status line and the buttons. A sync lists the channel, then
 * brings the new uploads in eight at a time (each with its thumbnail) until none are left,
 * showing "Added 24 of 127…" as it goes; Stop finishes the current eight and stops. Leaving
 * the page stops it too (it carries on from where it was next time).
 */
export function FilmSyncPanel({
  channelLink,
  hasChannel,
  autoPublish,
  syncedAt: initialSyncedAt,
}: {
  /** The channel's link from Settings → YouTube (empty when only an older channel id is stored). */
  channelLink: string;
  hasChannel: boolean;
  autoPublish: boolean;
  syncedAt: string | null;
}) {
  const router = useRouter();
  const titleId = useId();
  const [phase, setPhase] = useState<Phase>("idle");
  const [scope, setScope] = useState<Scope | null>(null);
  const [tally, setTally] = useState<Tally>(EMPTY);
  const [error, setError] = useState("");
  const [stopping, setStopping] = useState(false);
  const [syncedAt, setSyncedAt] = useState(initialSyncedAt);
  const stopRef = useRef(false);
  const runningRef = useRef(false);

  const running = phase === "checking" || phase === "importing";
  useProgressWhile(running);

  // Moving to another dashboard page stops the sync after the batch in flight.
  useEffect(
    () => () => {
      stopRef.current = true;
    },
    [],
  );

  // Closing or reloading the tab mid-sync drops the batch in flight: ask first.
  useEffect(() => {
    if (!running) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [running]);

  async function run() {
    if (runningRef.current) return;
    runningRef.current = true;
    stopRef.current = false;
    setStopping(false);
    setError("");
    setScope(null);
    setTally(EMPTY);
    setPhase("checking");
    let addedAny = false;
    const fail = (message: string) => {
      setError(message);
      setPhase("error");
    };

    try {
      const start = await startFilmSync().catch(() => null);
      if (!start) return fail("Couldn't reach the server. Check your connection and try again.");
      if (!start.ok) return fail(start.message);
      setScope(start);

      const queue = [...start.pending];
      const counts: Tally = { ...EMPTY, total: queue.length, skipped: [], failed: [] };
      setTally({ ...counts });
      setPhase("importing");

      let stalls = 0;
      while (queue.length > 0) {
        if (stopRef.current) {
          setPhase("stopped");
          return;
        }
        const slice = queue.splice(0, BATCH);
        const result = await importFilmsBatch(slice).catch(() => null);
        if (!result) return fail(`Lost touch with the server after adding ${plural(counts.added, "film")}. Sync again to carry on.`);
        if (!result.ok) return fail(result.message);

        const deferred = result.items.filter((item) => item.status === "deferred").map((item) => item.id);
        queue.unshift(...deferred);
        for (const item of result.items) {
          if (item.status === "added") {
            counts.added++;
            if (item.hidden) counts.hidden++;
            addedAny = true;
          } else if (item.status === "skipped") counts.skipped.push(item);
          else if (item.status === "failed") counts.failed.push(item);
        }
        counts.processed += slice.length - deferred.length;
        setTally({ ...counts, skipped: [...counts.skipped], failed: [...counts.failed] });

        if (deferred.length === slice.length) {
          if (++stalls >= 2) return fail("The server ran out of time twice in a row. Try again in a minute; what was added stays.");
        } else stalls = 0;
      }

      const finish = await finishFilmSync().catch(() => null);
      if (finish?.ok) setSyncedAt(finish.syncedAt);
      setPhase("done");
    } finally {
      runningRef.current = false;
      setStopping(false);
      // Show the new films in the list below.
      if (addedAny) router.refresh();
    }
  }

  const stop = () => {
    stopRef.current = true;
    setStopping(true);
  };

  const remaining = Math.max(0, tally.total - tally.processed);
  const percent = tally.total > 0 ? Math.round((tally.processed / tally.total) * 100) : 0;

  return (
    <section id="sync" aria-labelledby={titleId} className="flex scroll-mt-6 flex-col gap-4 rounded-card border border-line-strong bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id={titleId} className={`${fieldLabelClass} font-normal`}>
            Sync from YouTube
          </h2>
          {running ? <StatusBadge tone="gold">Syncing</StatusBadge> : phase === "error" ? <StatusBadge tone="red">Stopped</StatusBadge> : null}
        </div>
        {syncedAt ? <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Last full sync {formatDateTime(syncedAt)}</span> : null}
      </div>

      <p className="max-w-3xl text-xs leading-6 text-muted">
        Brings in every upload from the channel that isn&apos;t on the site yet, eight at a time, each with its thumbnail. New films come in{" "}
        {autoPublish ? "on the site straight away" : "hidden until you check them"} and marked “Needs curating”, so their titles and categories can be put right (
        <Link href={routes.dashboardSection("settings")} className="text-primary underline-offset-4 hover:underline">
          Settings → YouTube
        </Link>{" "}
        changes this). Shorts are skipped; age-restricted videos come in hidden. A deleted film comes back with the next sync: hide it instead to keep it off the site.
      </p>

      {!hasChannel ? (
        <p className="text-xs leading-6 text-muted">
          First add the channel&apos;s link in{" "}
          <Link href={routes.dashboardSection("settings")} className="text-primary underline-offset-4 hover:underline">
            Settings → YouTube
          </Link>
          .
        </p>
      ) : null}

      {phase === "checking" ? (
        <p role="status" className="text-xs leading-6 text-primary">
          Checking the channel for new uploads…
        </p>
      ) : null}

      {phase === "importing" ? (
        <div className="grid gap-2">
          <p role="status" className="text-xs leading-6 text-primary">
            {tally.total === 0
              ? "Nothing new to add."
              : stopping
                ? `Stopping after this batch… Added ${tally.added} of ${tally.total} so far.`
                : `Added ${tally.added} of ${tally.total}… (${plural(remaining, "upload")} to go)`}
            {tally.skipped.length + tally.failed.length > 0 ? ` · ${tally.skipped.length} skipped · ${tally.failed.length} couldn't be added` : ""}
          </p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-raised" role="progressbar" aria-label="Sync progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
            <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${percent}%` }} />
          </div>
        </div>
      ) : null}

      {phase === "done" && scope ? (
        <p role="status" className="text-xs leading-6 text-primary">
          {tally.added > 0
            ? `Done: added ${plural(tally.added, "film")}${tally.hidden > 0 ? ` (${tally.hidden} hidden)` : ""}. Find them under View: Needs curating.`
            : tally.total === 0
              ? `Up to date: the site has every upload on the channel (${plural(scope.uploads, "upload")} found).`
              : "Nothing was added."}
          {scope.shorts > 0 ? ` ${plural(scope.shorts, "Short")} skipped.` : ""}
          {tally.skipped.length > 0 ? ` ${tally.skipped.length} skipped (already here, from another channel, or not out yet).` : ""}
          {tally.failed.length > 0 ? ` ${tally.failed.length} couldn't be added (below).` : ""}
          {scope.source === "feed" ? " YouTube only listed its newest 15 uploads this time: sync again later for older ones." : !scope.complete ? " The channel's list was cut short: sync again to bring in the rest." : ""}
        </p>
      ) : null}

      {phase === "stopped" ? (
        <p role="status" className="text-xs leading-6 text-primary">
          Stopped. Added {tally.added} of {tally.total}; sync again to carry on from there.
        </p>
      ) : null}

      {phase === "error" ? (
        <p role="alert" className="text-xs leading-6 text-error">
          {error}
          {tally.added > 0 ? ` (${plural(tally.added, "film")} added before it stopped.)` : ""}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <SpriteButton type="button" onClick={() => void run()} disabled={running || !hasChannel}>
          {running ? (
            <>
              <Loader2 size={15} className="animate-spin" aria-hidden />
              Syncing…
            </>
          ) : (
            "Sync from YouTube"
          )}
        </SpriteButton>
        {running && phase === "importing" ? (
          <DashboardButton onClick={stop} disabled={stopping}>
            {stopping ? "Stopping…" : "Stop"}
          </DashboardButton>
        ) : null}
        {channelLink ? (
          <DashboardButton href={channelLink} external>
            Open the channel
          </DashboardButton>
        ) : null}
      </div>

      {!running && tally.failed.length > 0 ? (
        <details className="rounded-card border border-line bg-raised px-4 py-3">
          <summary className="cursor-pointer select-none text-sm text-strong">{plural(tally.failed.length, "upload")} couldn&apos;t be added</summary>
          <ul className="mt-3 grid gap-2 text-xs leading-5 text-muted">
            {tally.failed.map((item) => (
              <li key={item.id}>
                <a href={watchUrl(item.id)} target="_blank" rel="noopener noreferrer" className="font-mono text-foreground underline-offset-4 hover:text-primary hover:underline">
                  {item.title || item.id}
                </a>
                {item.note ? `: ${item.note}` : null}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-5 text-muted">A new sync tries them again. Any one can also be added with “Add by link”.</p>
        </details>
      ) : null}
    </section>
  );
}
