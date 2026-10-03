"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, ChevronRight, Database, FolderInput, FolderOpen, FolderPlus, LayoutGrid, Link2, List, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import { routes } from "@/lib/routes";
import {
  isPhotoFolder,
  parentPath,
  PHOTO_FOLDERS,
  plural,
  type StorageBucket,
  type StorageFile,
  type StorageFolder,
  type StorageListing,
  type StoragePicture,
} from "@/features/file-manager/domain/entities";
import {
  createBucketAction,
  createFolderAction,
  deleteBucketAction,
  deleteEntriesAction,
  deletePicturesAction,
  fileLinkAction,
  managerListEntries,
  moveEntriesAction,
  renameEntryAction,
  updateBucketAction,
  type ActionResult,
  type PictureRef,
} from "@/features/file-manager/presentation/actions";
import { DashboardButton } from "@/features/dashboard/presentation/components/ui/dashboard-button";
import { DashboardEmptyState, DashboardNotice } from "@/features/dashboard/presentation/components/ui/dashboard-ui";
import { ConfirmDialog, FormDialog } from "@/features/dashboard/presentation/components/ui/modal";
import { UploadDialog, type UploadedItem } from "@/features/dashboard/presentation/components/ui/upload-dialog";
import { useProgressWhile } from "@/features/dashboard/presentation/components/ui/use-progress-while";
import { SpriteButton } from "@/shared/components/ui/sprite-button";
import { EditBucketDialog, NewBucketDialog, type BucketSettingsInput } from "./bucket-dialogs";
import { BucketToolbar } from "./bucket-toolbar";
import { GridView, ListView, type EntryHandlers } from "./entry-views";
import { FileDetailsModal } from "./file-details-modal";
import {
  absoluteUrl,
  entryKey,
  entryName,
  filterLoaded,
  mergeLoaded,
  photoOfFile,
  PHOTOS_BUCKET,
  searchTokens,
  toLoaded,
  type Entry,
  type Item,
  type Loaded,
} from "./file-manager-model";
import type { MenuItem } from "./item-menu";
import { MoveDialog } from "./move-dialog";

type Dialog =
  | { kind: "new-folder" }
  | { kind: "new-bucket" }
  | { kind: "edit-bucket" }
  | { kind: "delete-bucket" }
  | { kind: "rename"; entry: StorageFolder | StorageFile }
  | { kind: "move"; paths: string[] }
  /** `leave`: the open folder itself is going, so go up a level afterwards. */
  | { kind: "delete"; paths: string[]; label: string; note?: string; leave?: boolean }
  | { kind: "delete-photos"; pictures: PictureRef[]; label: string };

type Notice = { tone: "success" | "error"; text: string };
/** A search's answer from the server, for one folder and one query. */
type Found = { here: string; text: string; loaded: Loaded; error?: string };

const OFFLINE = "Couldn't reach the server. Check your connection and try again.";
const SEARCH_CLASS =
  "h-11 w-full rounded-control border border-line-strong bg-raised pl-10 pr-4 text-sm text-strong outline-none transition-colors duration-150 placeholder:text-muted/70 focus:border-primary supports-[-webkit-touch-callout:none]:text-base";

function hrefFor(bucket: string, path: string, raw = false): string {
  const params = new URLSearchParams({ bucket });
  if (path) params.set("path", path);
  if (raw) params.set("raw", "1");
  return `${routes.dashboardSection("file-manager")}?${params.toString()}`;
}

function pictureRef(picture: StoragePicture): PictureRef {
  return { collection: picture.collection, name: picture.name, widths: picture.widths };
}

function ViewToggle({ view, onChange }: { view: "grid" | "list"; onChange: (view: "grid" | "list") => void }) {
  return (
    <div role="group" aria-label="View" className="flex overflow-hidden rounded-control border border-line-strong">
      {(["grid", "list"] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          aria-label={mode === "grid" ? "Grid view" : "List view"}
          aria-pressed={view === mode}
          title={mode === "grid" ? "Grid view" : "List view"}
          onClick={() => onChange(mode)}
          className={`inline-flex size-9 items-center justify-center transition-colors duration-150 pointer-coarse:size-[42px] ${
            view === mode ? "bg-primary-soft text-primary" : "text-muted hover:text-strong"
          }`}
        >
          {mode === "grid" ? <LayoutGrid size={16} aria-hidden /> : <List size={16} aria-hidden />}
        </button>
      ))}
    </div>
  );
}

function Crumbs({ bucket, prefix, onGo }: { bucket: StorageBucket; prefix: string; onGo: (path: string) => void }) {
  const parts = prefix ? prefix.split("/") : [];
  return (
    <nav aria-label="Folder" className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
      {parts.length > 0 ? (
        <button type="button" onClick={() => onGo("")} className="py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-primary hover:underline">
          {bucket.label}
        </button>
      ) : (
        <span aria-current="location" className="py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-primary">
          {bucket.label}
        </span>
      )}
      {parts.map((part, index) => {
        const path = parts.slice(0, index + 1).join("/");
        const last = index === parts.length - 1;
        return (
          <span key={path} className="flex min-w-0 items-center gap-1">
            <ChevronRight size={13} className="shrink-0 text-muted" aria-hidden />
            {last ? (
              <span aria-current="location" className="max-w-[16rem] truncate py-1 text-strong">
                {part}
              </span>
            ) : (
              <button type="button" onClick={() => onGo(path)} className="max-w-[12rem] truncate py-1 text-muted transition-colors duration-150 hover:text-strong">
                {part}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}

function HintButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="text-primary underline-offset-4 transition-colors duration-150 hover:text-primary-strong hover:underline">
      {children}
    </button>
  );
}

/**
 * The dashboard's file manager, as on the portfolio: buckets as chips (new, edit, delete),
 * a search, New folder, Upload and a grid/list switch, breadcrumbs, tiles or rows with a "…"
 * menu each (Open, Copy link, Rename, Move to…, Delete), ticks for moving or deleting several
 * at once, a details popup and "Show more" for big folders. The open bucket and folder live
 * in the URL (?bucket=files&path=price-lists), read on the server.
 *
 * Guards (the server checks them too): in Photos ("media") every processed photo is one tile
 * read from the media library and is only uploaded (sizes built) or deleted whole; its
 * folders are fixed, nothing in it is renamed or moved. Photos and Files can't be deleted or
 * made private. Uploads never overwrite.
 */
export function FileManagerView({
  buckets,
  activeBucket,
  prefix,
  raw,
  listing,
  listingError,
}: {
  buckets: StorageBucket[];
  activeBucket: string | null;
  prefix: string;
  /** A photo folder shown as stored (every size its own file) instead of from the library. */
  raw: boolean;
  /** The folder's first page, or null when there's no bucket or it couldn't be read. */
  listing: StorageListing | null;
  listingError: string | null;
}) {
  const router = useRouter();
  const bucket = buckets.find((entry) => entry.name === activeBucket) ?? null;
  const inMedia = bucket?.name === PHOTOS_BUCKET;
  const atMediaTop = inMedia && !prefix;
  const collection = inMedia && prefix && !prefix.includes("/") && isPhotoFolder(prefix) ? prefix : null;
  const photoView = collection !== null && !raw;
  const writable = bucket !== null && !inMedia;
  const canUpload = writable || photoView;
  const isPrivate = bucket !== null && !bucket.public;
  const here = `${activeBucket ?? ""}\n${prefix}\n${raw ? "raw" : ""}`;

  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [detail, setDetail] = useState<Item | null>(null);
  const [menuKey, setMenuKey] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [dialogError, setDialogError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [uploading, setUploading] = useState(false);
  const [more, setMore] = useState<{ base: StorageListing | null; loaded: Loaded } | null>(null);
  const [found, setFound] = useState<Found | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [opening, setOpening] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [navPending, startNav] = useTransition();
  const [shownHere, setShownHere] = useState(here);
  const searchRequest = useRef(0);
  const hereRef = useRef(here);
  useEffect(() => {
    hereRef.current = here;
  });

  // Another folder (a click here, or Back and Forward): it starts fresh.
  if (shownHere !== here) {
    setShownHere(here);
    setSearch("");
    setSelected(new Set());
    setDetail(null);
    setMenuKey(null);
    setFound(null);
  }

  // What the folder shows: the server's first page plus "Show more" pages (dropped when the page refreshes)…
  const baseLoaded = more && more.base === listing ? more.loaded : toLoaded(listing);
  // …narrowed by the search: on the spot when everything is loaded, else by the server, which sees the whole folder.
  const text = search.trim();
  const needsServer = text !== "" && bucket !== null && (atMediaTop || baseLoaded.nextOffset !== null);
  const answer = needsServer && found && found.here === here && found.text === text ? found : null;
  const searching = needsServer && answer === null;
  const shown = !text ? baseLoaded : answer && !answer.error ? answer.loaded : filterLoaded(baseLoaded, searchTokens(text));
  const nextOffset = !text ? baseLoaded.nextOffset : answer && !answer.error ? answer.loaded.nextOffset : null;

  useProgressWhile(navPending || loadingMore || searching || busy || opening);

  useEffect(() => {
    if (!needsServer || answer || !activeBucket) return;
    const id = ++searchRequest.current;
    const at = here;
    const query = text;
    const timer = window.setTimeout(() => {
      void managerListEntries(activeBucket, prefix, 0, query, raw)
        .catch((): ActionResult<StorageListing> => ({ ok: false, error: OFFLINE }))
        .then((result) => {
          if (id !== searchRequest.current) return;
          setFound(result.ok ? { here: at, text: query, loaded: toLoaded(result.data) } : { here: at, text: query, loaded: toLoaded(null), error: result.error });
        });
    }, 320);
    return () => window.clearTimeout(timer);
  }, [needsServer, answer, activeBucket, prefix, raw, here, text]);

  function go(bucketName: string, path: string, rawView = false) {
    setSelected(new Set());
    setDetail(null);
    setMenuKey(null);
    setNotice(null);
    setSearch("");
    setFound(null);
    // Only the query changes, which a link-click progress bar wouldn't see: this transition drives it.
    startNav(() => router.push(hrefFor(bucketName, path, rawView)));
  }

  function reload() {
    startNav(() => router.refresh());
  }

  async function showMore() {
    if (!activeBucket || nextOffset === null || loadingMore) return;
    const at = here;
    const fromSearch = text !== "" && answer !== null && !answer.error;
    const current = fromSearch && answer ? answer.loaded : baseLoaded;
    const base = listing;
    setLoadingMore(true);
    const result = await managerListEntries(activeBucket, prefix, nextOffset, fromSearch ? text : "", raw).catch((): ActionResult<StorageListing> => ({ ok: false, error: OFFLINE }));
    setLoadingMore(false);
    if (hereRef.current !== at) return;
    if (!result.ok) {
      setNotice({ tone: "error", text: `Couldn't load more: ${result.error}` });
      return;
    }
    if (fromSearch) setFound({ here: at, text, loaded: mergeLoaded(current, result.data) });
    else setMore({ base, loaded: mergeLoaded(current, result.data) });
  }

  function toggle(key: string) {
    setSelected((before) => {
      const next = new Set(before);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function openDialog(next: Dialog) {
    setMenuKey(null);
    setDialogError("");
    setDialog(next);
  }

  function closeDialog() {
    if (!busy) setDialog(null);
  }

  /** Runs a dialog's server action: the dialog spins until it's done, shows what went wrong, or closes. */
  async function perform<T>(task: () => Promise<ActionResult<T>>, done: (data: T) => void) {
    if (busy) return;
    setBusy(true);
    setDialogError("");
    const result = await task().catch((): ActionResult<T> => ({ ok: false, error: OFFLINE }));
    setBusy(false);
    if (!result.ok) {
      setDialogError(result.error);
      return;
    }
    setDialog(null);
    setSelected(new Set());
    setFound(null);
    done(result.data);
  }

  async function copyLink(item: Item) {
    const key = entryKey(item);
    const link = absoluteUrl(item.type === "picture" ? item.fullUrl : item.publicUrl);
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // The clipboard can be blocked (an http address, a strict browser): offer the link to copy by hand.
      window.prompt("Copy this link:", link);
      return;
    }
    setCopied(key);
    setNotice({ tone: "success", text: `Copied the link to “${entryName(item)}”.` });
    window.setTimeout(() => setCopied((current) => (current === key ? null : current)), 1500);
  }

  async function openItem(item: Item) {
    if (item.type === "picture") {
      window.open(absoluteUrl(item.fullUrl), "_blank", "noopener,noreferrer");
      return;
    }
    if (!bucket || bucket.public) {
      window.open(item.publicUrl, "_blank", "noopener,noreferrer");
      return;
    }
    // A private file needs a signed link. Open the tab now (one opened after a wait is blocked), then send it there.
    const tab = window.open("about:blank", "_blank");
    setOpening(true);
    const result = await fileLinkAction(bucket.name, item.path).catch((): ActionResult<string> => ({ ok: false, error: OFFLINE }));
    setOpening(false);
    if (!result.ok) {
      tab?.close();
      setNotice({ tone: "error", text: `Couldn't open “${item.name}”: ${result.error}` });
      return;
    }
    if (!tab) {
      setNotice({ tone: "error", text: "The browser blocked the new tab. Allow pop-ups for this site and try again." });
      return;
    }
    tab.opener = null;
    tab.location.href = result.data;
  }

  function menuFor(entry: Entry): MenuItem[] {
    if (!bucket) return [];
    if (entry.type === "folder") {
      // Photo folders are fixed: their tile just opens them.
      if (!writable) return [];
      return [
        { label: "Open", icon: <FolderOpen size={14} aria-hidden />, onSelect: () => go(bucket.name, entry.path) },
        { label: "Rename", icon: <Pencil size={14} aria-hidden />, onSelect: () => openDialog({ kind: "rename", entry }) },
        { label: "Move to…", icon: <FolderInput size={14} aria-hidden />, onSelect: () => openDialog({ kind: "move", paths: [entry.path] }) },
        {
          label: "Delete",
          icon: <Trash2 size={14} aria-hidden />,
          danger: true,
          onSelect: () =>
            openDialog({ kind: "delete", paths: [entry.path], label: `the folder “${entry.name}” and everything in it`, note: "Links to the files in it will stop working." }),
        },
      ];
    }
    const items: MenuItem[] = [{ label: "Open", icon: <ArrowUpRight size={14} aria-hidden />, onSelect: () => void openItem(entry) }];
    if (entry.type === "picture" || !isPrivate) items.push({ label: "Copy link", icon: <Link2 size={14} aria-hidden />, onSelect: () => void copyLink(entry) });
    if (entry.type === "picture") {
      if (entry.inStorage) {
        items.push({
          label: "Delete",
          icon: <Trash2 size={14} aria-hidden />,
          danger: true,
          onSelect: () => openDialog({ kind: "delete-photos", pictures: [pictureRef(entry)], label: `“${entryName(entry)}”` }),
        });
      }
      return items;
    }
    if (writable) {
      items.push(
        { label: "Rename", icon: <Pencil size={14} aria-hidden />, onSelect: () => openDialog({ kind: "rename", entry }) },
        { label: "Move to…", icon: <FolderInput size={14} aria-hidden />, onSelect: () => openDialog({ kind: "move", paths: [entry.path] }) },
        {
          label: "Delete",
          icon: <Trash2 size={14} aria-hidden />,
          danger: true,
          onSelect: () => openDialog({ kind: "delete", paths: [entry.path], label: `“${entry.name}”`, note: "Links to it will stop working." }),
        },
      );
    } else if (inMedia) {
      // A stored size or share image: it can go only with its whole photo.
      const photo = photoOfFile(prefix, entry.name);
      if (photo) {
        items.push({
          label: "Delete photo",
          icon: <Trash2 size={14} aria-hidden />,
          danger: true,
          onSelect: () => openDialog({ kind: "delete-photos", pictures: [photo], label: `the photo “${photo.name}”` }),
        });
      }
    }
    return items;
  }

  const handlers: EntryHandlers = {
    selected,
    menuKey,
    onMenu: setMenuKey,
    menuFor,
    canSelect: (entry) => (entry.type === "file" ? writable : entry.type === "picture" ? entry.inStorage : false),
    onToggle: toggle,
    onOpenFolder: (path) => {
      if (bucket) go(bucket.name, path);
    },
    onDetail: (item) => {
      setMenuKey(null);
      setDetail(item);
    },
  };

  const selectedFiles = shown.files.filter((file) => selected.has(entryKey(file)));
  const selectedPictures = shown.pictures.filter((picture) => selected.has(entryKey(picture)));
  const selectionCount = selectedFiles.length + selectedPictures.length;

  const onUploaded = (results: UploadedItem[]) => {
    const photos = results.filter((result) => result.kind === "image").length;
    setFound(null);
    setNotice({ tone: "success", text: photos > 0 ? `Uploaded ${plural(photos, "photo")}.` : `Uploaded ${plural(results.length, "file")}.` });
    reload();
  };

  // ── The parts of the page ──

  let hint: ReactNode = null;
  if (bucket) {
    if (atMediaTop) hint = "One folder for each part of the site. Open one to see its photos or to upload new ones.";
    else if (photoView && collection)
      hint = (
        <>
          {PHOTO_FOLDERS[collection]}. Each upload is kept in three sizes (480, 800 and 1280 px wide
          {collection === "products" ? "; big ones also 1920 px, for the zoom" : ""}) plus a share image, and the site picks the size it needs.{" "}
          <HintButton onClick={() => go(bucket.name, prefix, true)}>Show the stored files</HintButton>
        </>
      );
    else if (inMedia && collection)
      hint = (
        <>
          Every file as it&apos;s stored, each size on its own: for clearing out what a failed upload left behind.{" "}
          <HintButton onClick={() => go(bucket.name, prefix)}>Back to the photos</HintButton>
        </>
      );
    else if (inMedia) hint = "Files the photo uploader made. They change only with their photo.";
    else if (bucket.name === "files")
      hint = (
        <>
          PDFs, price lists and other documents, up to 25 MB each. Names are tidied for links: <span className="whitespace-nowrap">“Price List.pdf”</span> becomes{" "}
          <span className="whitespace-nowrap">price-list.pdf</span>.
        </>
      );
    else if (isPrivate) hint = "A private bucket: its files open only from here, through links that last an hour.";
    else hint = "Any kind of file, up to 25 MB each. Names are tidied for links, and anyone with a link can open the file.";
  }

  let body: ReactNode;
  const nothing = shown.folders.length + shown.files.length + shown.pictures.length === 0;
  if (listingError) {
    body = (
      <div className="grid justify-items-start gap-3">
        <DashboardNotice tone="error">{listingError}</DashboardNotice>
        <DashboardButton onClick={reload} pending={navPending}>
          Try again
        </DashboardButton>
      </div>
    );
  } else if (nothing && text) {
    body = searching ? (
      <DashboardEmptyState title="Searching…">Looking through the whole folder.</DashboardEmptyState>
    ) : (
      <DashboardEmptyState title={`Nothing matches “${text}”`} action={<DashboardButton onClick={() => setSearch("")}>Clear the search</DashboardButton>}>
        Try another word, or look in another folder.
      </DashboardEmptyState>
    );
  } else if (nothing && photoView) {
    body = (
      <DashboardEmptyState
        title={`No photos in ${collection} yet`}
        action={
          <SpriteButton type="button" onClick={() => setUploading(true)}>
            <Upload size={15} aria-hidden /> Upload
          </SpriteButton>
        }
      >
        Upload photos here, or from any photo field in the dashboard: they&apos;re saved in this folder.
      </DashboardEmptyState>
    );
  } else if (nothing && !writable) {
    body = <DashboardEmptyState title="This folder is empty" />;
  } else if (nothing && bucket) {
    const folderName = prefix.slice(prefix.lastIndexOf("/") + 1);
    body = (
      <DashboardEmptyState
        title={prefix ? "This folder is empty" : "No files uploaded yet"}
        action={
          <>
            <SpriteButton type="button" onClick={() => setUploading(true)}>
              <Upload size={15} aria-hidden /> Upload
            </SpriteButton>
            <DashboardButton onClick={() => openDialog({ kind: "new-folder" })}>
              <FolderPlus size={15} aria-hidden /> Create a folder
            </DashboardButton>
            {prefix && listing?.placeholder ? (
              <DashboardButton variant="danger" onClick={() => openDialog({ kind: "delete", paths: [prefix], label: `the empty folder “${folderName}”`, leave: true })}>
                <Trash2 size={15} aria-hidden /> Delete this folder
              </DashboardButton>
            ) : null}
          </>
        }
      >
        Upload PDFs, pictures, price lists or any other file, then copy a link to share it.
      </DashboardEmptyState>
    );
  } else {
    body =
      view === "grid" ? (
        <GridView loaded={shown} h={handlers} thumbs={!isPrivate} showCollection={atMediaTop} />
      ) : (
        <ListView loaded={shown} h={handlers} thumbs={!isPrivate} showCollection={atMediaTop} />
      );
  }

  const errorLine = dialogError ? (
    <span role="alert" className="mt-3 block text-error">
      {dialogError}
    </span>
  ) : null;

  return (
    <div className="grid min-w-0 grid-cols-1 gap-6">
      <BucketToolbar
        buckets={buckets}
        active={bucket}
        onChange={(name) => go(name, "")}
        onNew={() => openDialog({ kind: "new-bucket" })}
        onEdit={() => openDialog({ kind: "edit-bucket" })}
        onDelete={() => openDialog({ kind: "delete-bucket" })}
      />

      {!bucket ? (
        <DashboardEmptyState
          title="No storage buckets yet"
          action={
            <SpriteButton type="button" onClick={() => openDialog({ kind: "new-bucket" })}>
              <Plus size={15} aria-hidden /> New bucket
            </SpriteButton>
          }
        >
          Create a bucket to start uploading and organizing files.
        </DashboardEmptyState>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-0 flex-1 basis-60">
                <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={inMedia ? "Search photos or folders…" : "Search files or folders…"}
                  aria-label={inMedia ? "Search photos or folders" : "Search files or folders"}
                  maxLength={100}
                  autoComplete="off"
                  className={SEARCH_CLASS}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {writable ? (
                  <DashboardButton onClick={() => openDialog({ kind: "new-folder" })} aria-label="New folder" title="New folder">
                    <FolderPlus size={15} aria-hidden />
                    <span className="hidden sm:inline">New folder</span>
                  </DashboardButton>
                ) : null}
                {canUpload ? (
                  <SpriteButton type="button" onClick={() => setUploading(true)}>
                    <Upload size={15} aria-hidden /> Upload
                  </SpriteButton>
                ) : null}
                <ViewToggle view={view} onChange={setView} />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <Crumbs bucket={bucket} prefix={prefix} onGo={(path) => go(bucket.name, path)} />
              {selectionCount > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted">{selectionCount} selected</span>
                  {writable && selectedFiles.length > 0 ? (
                    <DashboardButton onClick={() => openDialog({ kind: "move", paths: selectedFiles.map((file) => file.path) })}>
                      <FolderInput size={14} aria-hidden /> Move
                    </DashboardButton>
                  ) : null}
                  <DashboardButton
                    variant="danger"
                    onClick={() =>
                      selectedPictures.length > 0
                        ? openDialog({ kind: "delete-photos", pictures: selectedPictures.map(pictureRef), label: plural(selectedPictures.length, "photo") })
                        : openDialog({
                            kind: "delete",
                            paths: selectedFiles.map((file) => file.path),
                            label: plural(selectedFiles.length, "file"),
                            note: selectedFiles.length === 1 ? "Links to it will stop working." : "Links to them will stop working.",
                          })
                    }
                  >
                    <Trash2 size={14} aria-hidden /> Delete
                  </DashboardButton>
                </div>
              ) : null}
            </div>

            {hint ? <p className="max-w-3xl text-sm leading-6 text-muted">{hint}</p> : null}
            {answer?.error ? (
              <p role="alert" className="text-xs leading-5 text-error">
                Couldn&apos;t search the whole folder ({answer.error}). These are the matches among what&apos;s loaded.
              </p>
            ) : null}
          </div>

          {notice ? <DashboardNotice tone={notice.tone}>{notice.text}</DashboardNotice> : null}

          {body}

          {nextOffset !== null && !listingError ? (
            <div className="flex justify-center">
              <DashboardButton onClick={() => void showMore()} pending={loadingMore}>
                {loadingMore ? "Loading…" : "Show more"}
              </DashboardButton>
            </div>
          ) : null}
        </>
      )}

      {/* ── Upload and details ── */}
      {bucket ? (
        <UploadDialog
          open={uploading}
          onClose={() => setUploading(false)}
          bucket={bucket.name}
          folder={prefix}
          mode={photoView ? "photo" : "file"}
          collection={collection ?? undefined}
          onUploaded={onUploaded}
        />
      ) : null}
      {bucket ? (
        <FileDetailsModal
          item={detail}
          bucket={bucket}
          copied={detail !== null && copied === entryKey(detail)}
          opening={opening}
          onClose={() => setDetail(null)}
          onCopy={(item) => void copyLink(item)}
          onOpen={(item) => void openItem(item)}
        />
      ) : null}

      {/* ── Dialogs (each spins while its action runs and shows what went wrong) ── */}
      <NewBucketDialog
        open={dialog?.kind === "new-bucket"}
        pending={busy}
        error={dialogError}
        onClose={closeDialog}
        onCreate={(name, isPublic) =>
          void perform(
            () => createBucketAction(name, isPublic),
            (created) => {
              go(created.name, "");
              setNotice({ tone: "success", text: `Created the bucket “${created.name}”.` });
            },
          )
        }
      />
      <EditBucketDialog
        open={dialog?.kind === "edit-bucket"}
        bucket={bucket}
        pending={busy}
        error={dialogError}
        onClose={closeDialog}
        onSave={(settings: BucketSettingsInput) => {
          if (!bucket) return;
          void perform(
            () => updateBucketAction(bucket.name, settings),
            () => setNotice({ tone: "success", text: `Saved the settings for ${bucket.label}.` }),
          );
        }}
      />
      {dialog?.kind === "delete-bucket" && bucket ? (
        <ConfirmDialog
          open
          onClose={closeDialog}
          title="Delete bucket"
          icon={<Database size={20} />}
          message={
            <>
              Permanently delete the “{bucket.label}” bucket and everything inside it? This can&apos;t be undone.
              {errorLine}
            </>
          }
          confirmLabel="Delete bucket"
          danger
          pending={busy}
          onConfirm={() =>
            void perform(
              () => deleteBucketAction(bucket.name),
              () => {
                startNav(() => router.replace(routes.dashboardSection("file-manager")));
                setNotice({ tone: "success", text: `Deleted the bucket “${bucket.label}”.` });
              },
            )
          }
        />
      ) : null}
      {bucket ? (
        <FormDialog
          open={dialog?.kind === "new-folder"}
          onClose={closeDialog}
          title="Create new folder"
          description={prefix ? `Inside ${bucket.label} / ${prefix}.` : `In ${bucket.label}.`}
          label="Folder name"
          placeholder="e.g. price-lists"
          hint="Latin letters, digits and hyphens: “Price Lists” becomes price-lists."
          submitLabel="Create folder"
          pendingLabel="Creating…"
          pending={busy}
          error={dialogError || undefined}
          maxLength={120}
          onSubmit={(name) =>
            void perform(
              () => createFolderAction(bucket.name, prefix, name),
              (made) => setNotice({ tone: "success", text: `Created the folder “${made.name}”.` }),
            )
          }
        />
      ) : null}
      {dialog?.kind === "rename" && bucket ? (
        <FormDialog
          open
          onClose={closeDialog}
          title={dialog.entry.type === "folder" ? "Rename folder" : "Rename file"}
          label="New name"
          defaultValue={dialog.entry.name}
          hint={
            dialog.entry.type === "folder"
              ? "Latin letters, digits and hyphens. Everything inside moves with it, so links to those files change."
              : "Tidied for links like uploads are; the extension stays if you leave it out. Old links to the file stop working."
          }
          submitLabel="Save"
          pending={busy}
          error={dialogError || undefined}
          maxLength={200}
          onSubmit={(name) =>
            void perform(
              () => renameEntryAction(bucket.name, dialog.entry.path, name),
              (renamed) =>
                setNotice({
                  tone: "success",
                  text: renamed.path === dialog.entry.path ? "The name didn't change." : `Renamed “${dialog.entry.name}” to “${renamed.name}”.`,
                }),
            )
          }
        />
      ) : null}
      <MoveDialog
        open={dialog?.kind === "move"}
        bucket={bucket}
        prefix={prefix}
        paths={dialog?.kind === "move" ? dialog.paths : []}
        folderPaths={baseLoaded.folders.map((folder) => folder.path)}
        pending={busy}
        error={dialogError}
        onClose={closeDialog}
        onMove={(destination) => {
          if (!bucket || dialog?.kind !== "move") return;
          void perform(
            () => moveEntriesAction(bucket.name, dialog.paths, destination),
            (moved) =>
              setNotice({
                tone: "success",
                text: moved.moved === 0 ? "Nothing needed moving." : `Moved ${plural(moved.moved, "item")} to ${destination ? `“${destination}”` : "the top level"}.`,
              }),
          );
        }}
      />
      {dialog?.kind === "delete" && bucket ? (
        <ConfirmDialog
          open
          onClose={closeDialog}
          title="Delete"
          message={
            <>
              Delete {dialog.label}? {dialog.note ? `${dialog.note} ` : ""}This can&apos;t be undone.
              {errorLine}
            </>
          }
          confirmLabel="Delete"
          danger
          pending={busy}
          onConfirm={() =>
            void perform(
              () => deleteEntriesAction(bucket.name, dialog.paths),
              () => {
                if (dialog.leave) go(bucket.name, parentPath(prefix));
                setNotice({ tone: "success", text: `Deleted ${dialog.label}.` });
              },
            )
          }
        />
      ) : null}
      {dialog?.kind === "delete-photos" ? (
        <ConfirmDialog
          open
          onClose={closeDialog}
          title={dialog.pictures.length === 1 ? "Delete photo" : "Delete photos"}
          message={
            <>
              Delete {dialog.label}? Every size, the share image and the library entry go too, and pages that use {dialog.pictures.length === 1 ? "it" : "them"} will lose{" "}
              {dialog.pictures.length === 1 ? "it" : "them"}. This can&apos;t be undone.
              {errorLine}
            </>
          }
          confirmLabel="Delete"
          danger
          pending={busy}
          onConfirm={() =>
            void perform(
              () => deletePicturesAction(dialog.pictures),
              (result) =>
                setNotice(
                  result.failed.length > 0
                    ? { tone: "error", text: `Deleted ${plural(result.deleted, "photo")}. Not deleted: ${result.failed.join(" ")}` }
                    : { tone: "success", text: `Deleted ${dialog.label}.` },
                ),
            )
          }
        />
      ) : null}
    </div>
  );
}
