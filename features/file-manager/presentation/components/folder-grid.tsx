"use client";

import { Folder } from "lucide-react";

export type FolderTile = { name: string; path: string; note?: string };

/** Subfolders as tiles; a note says what a photo folder is for. */
export function FolderGrid({ folders, onOpen }: { folders: FolderTile[]; onOpen: (path: string) => void }) {
  const withNotes = folders.some((folder) => folder.note);
  return (
    <ul className={`grid gap-3 ${withNotes ? "grid-cols-1 min-[440px]:grid-cols-2 lg:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"}`}>
      {folders.map((folder) => (
        <li key={folder.path} className="min-w-0">
          <button
            type="button"
            onClick={() => onOpen(folder.path)}
            className="flex h-full min-h-14 w-full items-center gap-3 rounded-card border border-line bg-surface px-4 py-3 text-left transition-colors duration-150 hover:border-line-strong"
          >
            <Folder className="h-5 w-5 shrink-0 text-primary" aria-hidden />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-strong">{folder.name}</span>
              {folder.note && <span className="mt-0.5 block text-xs leading-snug text-muted">{folder.note}</span>}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
