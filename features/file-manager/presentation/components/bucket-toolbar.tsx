"use client";

import { Database, Lock, Plus, Settings2, Trash2 } from "lucide-react";
import type { StorageBucket } from "@/features/file-manager/domain/entities";
import { DashboardButton } from "@/features/dashboard/presentation/components/ui/dashboard-button";
import { useDragScroll } from "./use-drag-scroll";

/**
 * The portfolio file manager's top row: the buckets as chips in one strip that scrolls
 * sideways (drag it with a mouse), then New bucket, Edit bucket and Delete. Photos and Files
 * can't be deleted (the site serves from them), so they get no Delete.
 */
export function BucketToolbar({
  buckets,
  active,
  onChange,
  onNew,
  onEdit,
  onDelete,
}: {
  buckets: StorageBucket[];
  active: StorageBucket | null;
  onChange: (bucket: string) => void;
  onNew: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { handlers: dragHandlers, className: dragClass } = useDragScroll<HTMLDivElement>();
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="inline-flex shrink-0 items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-primary">
          <Database size={13} aria-hidden /> Bucket
        </span>
        {buckets.length > 0 ? (
          <div
            {...dragHandlers}
            role="group"
            aria-label="Buckets"
            className={`flex min-w-0 flex-1 gap-1.5 overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${dragClass}`}
          >
            {buckets.map((bucket) => {
              const on = bucket.name === active?.name;
              return (
                <button
                  key={bucket.id}
                  type="button"
                  aria-pressed={on}
                  title={bucket.label !== bucket.name ? `${bucket.label} (${bucket.name})` : undefined}
                  onClick={() => onChange(bucket.name)}
                  className={`inline-flex min-h-9 shrink-0 select-none items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-sm font-medium transition-colors duration-150 pointer-coarse:min-h-11 ${
                    on ? "border-primary/40 bg-primary-soft text-primary" : "border-line-strong text-muted hover:text-strong"
                  }`}
                >
                  {bucket.label}
                  {bucket.public ? null : (
                    <span className="inline-flex items-center gap-1 text-[11px] opacity-75">
                      <Lock size={11} aria-hidden />
                      private
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
        <DashboardButton onClick={onNew}>
          <Plus size={14} aria-hidden /> New bucket
        </DashboardButton>
        {active ? (
          <DashboardButton onClick={onEdit}>
            <Settings2 size={14} aria-hidden /> Edit bucket
          </DashboardButton>
        ) : null}
        {active && !active.protected ? (
          <DashboardButton variant="danger" onClick={onDelete}>
            <Trash2 size={14} aria-hidden /> Delete
          </DashboardButton>
        ) : null}
      </div>
    </div>
  );
}
