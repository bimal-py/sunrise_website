"use client";

import Image from "next/image";
import { StatusBadge } from "@/features/dashboard/presentation/components/ui";
import { pictureLinks } from "@/features/file-manager/data/browser-storage";
import type { Picture } from "@/features/file-manager/domain/entities";

export function sizesLabel(picture: Picture): string {
  if (picture.view === "share") return "1200 × 630 px";
  return picture.widths.length > 0 ? `${picture.widths.join(" · ")} px` : "No sizes";
}

/** One tile per photo (its sizes grouped), thumbnail from the 480px file. A tile opens the photo's links and actions. */
export function PhotoGrid({ pictures, isNew, onOpen }: { pictures: Picture[]; isNew: (picture: Picture) => boolean; onOpen: (picture: Picture) => void }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {pictures.map((picture) => (
        <li key={`${picture.view}:${picture.name}`} className="min-w-0">
          <button
            type="button"
            onClick={() => onOpen(picture)}
            aria-haspopup="dialog"
            className="flex w-full flex-col overflow-hidden rounded-card border border-line bg-surface text-left transition-colors duration-150 hover:border-line-strong"
          >
            <span className="relative block aspect-[4/3] w-full bg-raised">
              <Image
                src={pictureLinks(picture).thumb}
                alt=""
                fill
                unoptimized
                sizes="(min-width: 1280px) 200px, (min-width: 640px) 25vw, 50vw"
                className="object-cover"
              />
              {isNew(picture) && (
                <span className="absolute left-2 top-2">
                  <StatusBadge tone="gold">New</StatusBadge>
                </span>
              )}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5 px-3 py-2.5">
              <span className="truncate font-mono text-xs text-strong">{picture.name}</span>
              <span className="truncate font-mono text-[11px] text-muted">{sizesLabel(picture)}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
