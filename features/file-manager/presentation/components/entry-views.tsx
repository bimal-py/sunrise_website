"use client";

import Image from "next/image";
import { Folder } from "lucide-react";
import { formatBytes, type StorageFile, type StorageFolder, type StoragePicture } from "@/features/file-manager/domain/entities";
import { FileIcon } from "@/features/dashboard/presentation/components/ui/file-icon";
import { AfBrackets } from "@/shared/components/ui/af-brackets";
import { ItemMenu, type MenuItem } from "./item-menu";
import { drawable, entryKey, entryName, shortDate, THUMB_LIMIT, type Entry, type Item, type Loaded } from "./file-manager-model";

/** What a tile or row can do, decided by the manager (which knows the bucket's guards). */
export type EntryHandlers = {
  selected: Set<string>;
  menuKey: string | null;
  onMenu: (key: string | null) => void;
  menuFor: (entry: Entry) => MenuItem[];
  canSelect: (entry: Entry) => boolean;
  onToggle: (key: string) => void;
  onOpenFolder: (path: string) => void;
  onDetail: (item: Item) => void;
};

type ViewProps = {
  loaded: Loaded;
  h: EntryHandlers;
  /** Raw pictures may show as thumbnails (not in a private bucket, whose links need a token). */
  thumbs: boolean;
  /** Photos from several folders (a search across Photos): say which folder each is in. */
  showCollection: boolean;
};

const GRID = "grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4";
const TILE = "af-card group relative min-w-0 rounded-card border bg-surface transition-colors duration-150";
const ROW =
  "flex min-w-0 items-center gap-2 border-b border-line px-2 py-1 transition-colors duration-150 first:rounded-t-card last:rounded-b-card last:border-b-0 hover:bg-raised sm:gap-3 sm:px-3";

function showsThumb(file: StorageFile, thumbs: boolean): boolean {
  return thumbs && drawable(file) && file.size > 0 && file.size <= THUMB_LIMIT;
}

function pictureMeta(picture: StoragePicture, showCollection: boolean): string {
  return [`${picture.image.width} × ${picture.image.height}`, showCollection ? picture.collection : "", shortDate(picture.createdAt)].filter(Boolean).join(" · ");
}

function fileMeta(file: StorageFile): string {
  return [formatBytes(file.size), shortDate(file.updatedAt)].filter(Boolean).join(" · ");
}

/** A tick box with a finger-sized hit area; over a photo it sits on a small dark chip. */
function SelectBox({ label, checked, onChange, onImage = false, className = "" }: { label: string; checked: boolean; onChange: () => void; onImage?: boolean; className?: string }) {
  const box = <input type="checkbox" checked={checked} onChange={onChange} aria-label={`Select ${label}`} className="size-4 cursor-pointer accent-primary" />;
  return (
    <label className={`flex size-9 shrink-0 cursor-pointer items-center justify-center pointer-coarse:size-11 ${className}`}>
      {onImage ? <span className="flex size-7 items-center justify-center rounded-control bg-background/80">{box}</span> : box}
    </label>
  );
}

function Menu({ entry, h, onImage = false }: { entry: Entry; h: EntryHandlers; onImage?: boolean }) {
  const key = entryKey(entry);
  return <ItemMenu label={entryName(entry)} items={h.menuFor(entry)} open={h.menuKey === key} onOpenChange={(open) => h.onMenu(open ? key : null)} onImage={onImage} />;
}

// ── Grid ─────────────────────────────────────────────────────────────────────────────────────

function FolderTile({ folder, h }: { folder: StorageFolder; h: EntryHandlers }) {
  const open = h.menuKey === entryKey(folder);
  return (
    <li className={`${TILE} border-line hover:border-line-strong`}>
      <AfBrackets />
      <button type="button" onClick={() => h.onOpenFolder(folder.path)} className="flex w-full min-w-0 flex-col gap-3 rounded-card p-4 text-left sm:p-5">
        <Folder size={32} className="shrink-0 text-primary" aria-hidden />
        <span className="block min-w-0">
          <span className="block truncate text-sm font-semibold text-strong transition-colors duration-150 group-hover:text-primary">{folder.name}</span>
          {folder.description ? <span className="mt-1 line-clamp-2 block text-xs leading-5 text-muted">{folder.description}</span> : null}
        </span>
      </button>
      <div className={`absolute right-2 top-2 sm:right-3 sm:top-3 ${open ? "z-30" : "z-10"}`}>
        <Menu entry={folder} h={h} />
      </div>
    </li>
  );
}

function ItemTile({ item, h, thumbs, showCollection }: { item: Item; h: EntryHandlers; thumbs: boolean; showCollection: boolean }) {
  const key = entryKey(item);
  const selected = h.selected.has(key);
  const open = h.menuKey === key;
  const name = entryName(item);
  return (
    <li className={`${TILE} ${selected ? "border-primary" : "border-line hover:border-line-strong"}`}>
      <AfBrackets />
      <button type="button" onClick={() => h.onDetail(item)} aria-haspopup="dialog" className="block w-full min-w-0 rounded-card p-3 text-left">
        <span className="relative mb-3 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-control bg-raised">
          {item.type === "picture" ? (
            <Image
              src={item.thumbUrl}
              alt=""
              fill
              unoptimized
              loading="lazy"
              sizes="(min-width: 1280px) 290px, (min-width: 1024px) 30vw, 50vw"
              placeholder={item.image.blurDataURL ? "blur" : "empty"}
              blurDataURL={item.image.blurDataURL || undefined}
              className="object-cover"
            />
          ) : showsThumb(item, thumbs) ? (
            <Image src={item.publicUrl} alt="" fill unoptimized loading="lazy" sizes="(min-width: 1280px) 290px, (min-width: 1024px) 30vw, 50vw" className="object-cover" />
          ) : (
            <FileIcon kind={item.kind} size={36} className="text-muted" />
          )}
        </span>
        <span className="flex min-w-0 items-center gap-2">
          {item.type === "file" ? <FileIcon kind={item.kind} size={16} className="shrink-0 text-primary" /> : null}
          <span className="truncate text-sm font-medium text-strong">{name}</span>
        </span>
        <span className="mt-1 block truncate text-xs text-muted">{item.type === "picture" ? pictureMeta(item, showCollection) : fileMeta(item)}</span>
      </button>
      {h.canSelect(item) ? <SelectBox label={name} checked={selected} onChange={() => h.onToggle(key)} onImage className="absolute left-3 top-3 z-10" /> : null}
      <div className={`absolute right-3 top-3 ${open ? "z-30" : "z-10"}`}>
        <Menu entry={item} h={h} onImage />
      </div>
    </li>
  );
}

/** Folders, then photos, then files, each as its own grid of tiles (the portfolio's GridBody). */
export function GridView({ loaded, h, thumbs, showCollection }: ViewProps) {
  return (
    <div className="grid gap-5">
      {loaded.folders.length > 0 ? (
        <ul aria-label="Folders" className={GRID}>
          {loaded.folders.map((folder) => (
            <FolderTile key={folder.path} folder={folder} h={h} />
          ))}
        </ul>
      ) : null}
      {loaded.pictures.length > 0 ? (
        <ul aria-label="Photos" className={GRID}>
          {loaded.pictures.map((picture) => (
            <ItemTile key={picture.path} item={picture} h={h} thumbs={thumbs} showCollection={showCollection} />
          ))}
        </ul>
      ) : null}
      {loaded.files.length > 0 ? (
        <ul aria-label="Files" className={GRID}>
          {loaded.files.map((file) => (
            <ItemTile key={file.path} item={file} h={h} thumbs={thumbs} showCollection={showCollection} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

// ── List ─────────────────────────────────────────────────────────────────────────────────────

/** One row per entry in a single bordered box (the portfolio's ListBody), sizes and dates on wider screens. */
export function ListView({ loaded, h, thumbs, showCollection }: ViewProps) {
  return (
    <ul aria-label="Folder contents" className="rounded-card border border-line bg-surface">
      {loaded.folders.map((folder) => (
        <li key={folder.path} className={ROW}>
          <span className="flex size-9 shrink-0 items-center justify-center pointer-coarse:size-11">
            <Folder size={18} className="text-primary" aria-hidden />
          </span>
          <button
            type="button"
            onClick={() => h.onOpenFolder(folder.path)}
            className="min-w-0 flex-1 truncate py-2 text-left text-sm font-medium text-strong transition-colors duration-150 hover:text-primary pointer-coarse:py-3"
          >
            {folder.name}
          </button>
          <span className="hidden max-w-[45%] shrink-0 truncate text-xs text-muted sm:block">{folder.description ?? "Folder"}</span>
          <Menu entry={folder} h={h} />
        </li>
      ))}
      {[...loaded.pictures, ...loaded.files].map((item) => {
        const key = entryKey(item);
        const name = entryName(item);
        const meta = item.type === "picture" ? pictureMeta(item, showCollection) : formatBytes(item.size);
        const date = item.type === "picture" ? "" : shortDate(item.updatedAt);
        return (
          <li key={key} className={ROW}>
            {h.canSelect(item) ? (
              <SelectBox label={name} checked={h.selected.has(key)} onChange={() => h.onToggle(key)} />
            ) : (
              <span aria-hidden className="size-9 shrink-0 pointer-coarse:size-11" />
            )}
            <span className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-control bg-raised">
              {item.type === "picture" ? (
                <Image src={item.thumbUrl} alt="" fill unoptimized loading="lazy" sizes="36px" className="object-cover" />
              ) : showsThumb(item, thumbs) ? (
                <Image src={item.publicUrl} alt="" fill unoptimized loading="lazy" sizes="36px" className="object-cover" />
              ) : (
                <FileIcon kind={item.kind} size={16} className="text-primary" />
              )}
            </span>
            <button
              type="button"
              onClick={() => h.onDetail(item)}
              aria-haspopup="dialog"
              className="min-w-0 flex-1 truncate py-2 text-left text-sm font-medium text-strong transition-colors duration-150 hover:text-primary pointer-coarse:py-3"
            >
              {name}
            </button>
            <span className="hidden shrink-0 text-xs text-muted sm:inline">{meta}</span>
            {date ? <span className="hidden w-24 shrink-0 text-right text-xs text-muted md:inline">{date}</span> : null}
            <Menu entry={item} h={h} />
          </li>
        );
      })}
    </ul>
  );
}
