"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronRight, Folder, Loader2, Lock, Search, Upload } from "lucide-react";
import type { MediaCollection } from "@/lib/media/process-image";
import type { ImageAsset } from "@/shared/domain/image";
import { SpriteButton } from "@/shared/components/ui/sprite-button";
import {
  formatBytes,
  isPhotoFolder,
  nameFromSrc,
  pictureUrl,
  type FileKind,
  type StorageBucket,
  type StorageFile,
  type StorageFolder,
  type StoragePicture,
} from "@/features/file-manager/domain/entities";
import { pickerListBuckets, pickerListEntries } from "@/features/file-manager/presentation/actions";
import { resolveImageUrl } from "../../actions/media";
import { dashboardButtonClass } from "./button-classes";
import { FileIcon } from "./file-icon";
import { Modal } from "./modal";
import { UploadDialog, type UploadedItem } from "./upload-dialog";
import { useProgressWhile } from "./use-progress-while";

/** What the picker hands back: a photo the site can use as it is, or a stored file's link. */
export type PickResult = { kind: "image"; image: ImageAsset & { alt?: string } } | { kind: "file"; url: string; bucket: string; path: string };

type FilePickerDialogProps = {
  open: boolean;
  onClose: () => void;
  /** "image": photos from the library (and pictures from other buckets, imported on insert). "file": any stored file. */
  mode: "image" | "file";
  /** The photo folder to open at, and where uploaded or imported photos go. */
  collection?: MediaCollection;
  /** Called once per chosen item, in order, when Insert is pressed. */
  onPick: (result: PickResult) => void;
  /** How many can be chosen at once (default 1). */
  max?: number;
};

type Choice = { key: string; picture: StoragePicture } | { key: string; file: StorageFile; bucket: string };
type Loaded = { folders: StorageFolder[]; files: StorageFile[]; pictures: StoragePicture[]; nextOffset: number | null };

const KINDS: { key: FileKind | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "image", label: "Images" },
  { key: "video", label: "Video" },
  { key: "audio", label: "Audio" },
  { key: "pdf", label: "PDF" },
  { key: "other", label: "Other" },
];
/** Raw pictures bigger than this show an icon rather than downloading the whole file as a thumbnail. */
const THUMB_LIMIT = 3_000_000;
const EMPTY: Loaded = { folders: [], files: [], pictures: [], nextOffset: null };

const chip = (active: boolean) =>
  `inline-flex min-h-8 items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-150 ${
    active ? "border-primary/40 bg-primary-soft text-primary" : "border-line-strong text-muted hover:text-strong"
  }`;

function uploadedPicture(item: Extract<UploadedItem, { kind: "image" }>, collection: string): StoragePicture {
  const name = nameFromSrc(item.image.src);
  return {
    type: "picture",
    id: `new-${name}`,
    collection,
    name,
    path: `${collection}/${name}`,
    image: item.image,
    alt: item.alt,
    inStorage: true,
    bytes: 0,
    createdAt: new Date().toISOString(),
    widths: [480, 800, 1280],
    thumbUrl: pictureUrl(item.image.src, 480),
    fullUrl: pictureUrl(item.image.src, 1280),
  };
}

/**
 * The portfolio's file picker: buckets as chips, folders with breadcrumbs, a search, a type
 * filter, tiles to select (double-click inserts), "Show more" for big folders and an Upload
 * button (the upload dialog, inside). In image mode a photo from the library comes back as it
 * is; a picture from another bucket (e.g. Files) is turned into a library photo on Insert.
 */
export function FilePickerDialog(props: FilePickerDialogProps) {
  if (!props.open) return null;
  return <PickerBody {...props} />;
}

function PickerBody({ onClose, mode, collection, onPick, max = 1 }: FilePickerDialogProps) {
  const images = mode === "image";
  const [buckets, setBuckets] = useState<StorageBucket[]>([]);
  const [bucket, setBucket] = useState<string | null>(null);
  const [prefix, setPrefix] = useState("");
  const [loaded, setLoaded] = useState<Loaded>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<FileKind | "all">(images ? "image" : "all");
  const [selected, setSelected] = useState<Choice[]>([]);
  const [importing, setImporting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const request = useRef(0);
  useProgressWhile(loading || loadingMore || importing);

  const current = buckets.find((entry) => entry.name === bucket) ?? null;
  const inMedia = bucket === "media";
  const uploadCollection: MediaCollection = inMedia && prefix && isPhotoFolder(prefix) ? prefix : (collection ?? "site");

  async function load(bucketName: string, path: string, searchText: string, offset = 0) {
    const id = ++request.current;
    if (offset === 0) setLoading(true);
    else setLoadingMore(true);
    const result = await pickerListEntries(bucketName, path, offset, searchText).catch(() => ({ ok: false as const, error: "Couldn't reach the server. Check your connection." }));
    if (id !== request.current) return;
    setLoading(false);
    setLoadingMore(false);
    if (!result.ok) {
      setError(result.error);
      if (offset === 0) setLoaded(EMPTY);
      return;
    }
    setError("");
    const page = result.data;
    setLoaded((before) => {
      if (offset === 0) return { folders: page.folders, files: page.files, pictures: page.pictures, nextOffset: page.nextOffset };
      const seen = new Set([...before.folders, ...before.files, ...before.pictures].map((entry) => entry.path));
      return {
        folders: [...before.folders, ...page.folders.filter((entry) => !seen.has(entry.path))],
        files: [...before.files, ...page.files.filter((entry) => !seen.has(entry.path))],
        pictures: [...before.pictures, ...page.pictures.filter((entry) => !seen.has(entry.path))],
        nextOffset: page.nextOffset,
      };
    });
  }

  // On open: the buckets, then the starting folder (the field's photo folder, or Files).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await pickerListBuckets().catch(() => ({ ok: false as const, error: "Couldn't reach the server. Check your connection." }));
      if (cancelled) return;
      if (!result.ok) {
        setLoading(false);
        setError(result.error);
        return;
      }
      const usable = images ? result.data : result.data.filter((entry) => entry.name !== "media");
      setBuckets(usable);
      const start = images ? (usable.find((entry) => entry.name === "media") ?? usable[0]) : (usable.find((entry) => entry.name === "files") ?? usable[0]);
      if (!start) {
        setLoading(false);
        return;
      }
      const path = images && start.name === "media" && collection ? collection : "";
      setBucket(start.name);
      setPrefix(path);
      void load(start.name, path, "");
    })();
    return () => {
      cancelled = true;
    };
    // Runs once per opening; the dialog's body remounts every time it opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Searching waits for a pause in typing.
  useEffect(() => {
    const text = query.trim();
    if (!bucket || text === search) return;
    const timer = window.setTimeout(() => {
      setSearch(text);
      void load(bucket, prefix, text);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [query, bucket, prefix, search]);

  const go = (bucketName: string, path: string) => {
    setBucket(bucketName);
    setPrefix(path);
    setQuery("");
    setSearch("");
    void load(bucketName, path, "");
  };

  const toggle = (choice: Choice) => {
    setSelected((before) => {
      if (before.some((entry) => entry.key === choice.key)) return before.filter((entry) => entry.key !== choice.key);
      if (max <= 1) return [choice];
      if (before.length >= max) return before;
      return [...before, choice];
    });
  };

  async function insert(choices: Choice[]) {
    if (choices.length === 0 || importing) return;
    setImporting(true);
    setError("");
    const results: PickResult[] = [];
    for (const choice of choices) {
      if ("picture" in choice) {
        results.push({ kind: "image", image: { ...choice.picture.image, alt: choice.picture.alt } });
      } else if (!images) {
        results.push({ kind: "file", url: choice.file.publicUrl, bucket: choice.bucket, path: choice.file.path });
      } else {
        const resolved = await resolveImageUrl(choice.file.publicUrl, collection ?? "site").catch(() => ({ ok: false as const, error: "Couldn't reach the server." }));
        if (!resolved.ok) {
          setImporting(false);
          setError(`${choice.file.name}: ${resolved.error}`);
          return;
        }
        results.push({ kind: "image", image: { ...resolved.image, alt: resolved.alt } });
      }
    }
    setImporting(false);
    results.forEach((result) => onPick(result));
    onClose();
  }

  const onUploaded = (results: UploadedItem[]) => {
    if (images) {
      const photos = results.filter((result): result is Extract<UploadedItem, { kind: "image" }> => result.kind === "image");
      if (photos.length === 0) return;
      // One new photo for a one-photo field: that's the choice.
      if (max <= 1 && photos.length === 1) {
        onPick({ kind: "image", image: { ...photos[0].image, alt: photos[0].alt } });
        onClose();
        return;
      }
      const fresh = photos.map((photo) => uploadedPicture(photo, uploadCollection)).slice(0, max);
      setSelected(fresh.map((picture) => ({ key: `p:${picture.path}`, picture })));
      if (buckets.some((entry) => entry.name === "media")) go("media", uploadCollection);
      else setLoaded((before) => ({ ...before, pictures: [...fresh, ...before.pictures] }));
      return;
    }
    const files = results.filter((result): result is Extract<UploadedItem, { kind: "file" }> => result.kind === "file");
    if (files.length === 0 || !bucket) return;
    if (max <= 1 && files.length === 1) {
      onPick({ kind: "file", url: files[0].url, bucket: files[0].bucket, path: files[0].path });
      onClose();
      return;
    }
    setSelected(
      files.slice(0, max).map((file) => ({
        key: `f:${file.bucket}/${file.path}`,
        bucket: file.bucket,
        file: { type: "file", name: file.name, path: file.path, size: file.size, mimeType: file.type || null, updatedAt: new Date().toISOString(), publicUrl: file.url, kind: "other" },
      })),
    );
    void load(bucket, prefix, search);
  };

  const showKinds = Boolean(bucket) && !inMedia;
  const files = showKinds && kind !== "all" ? loaded.files.filter((file) => file.kind === kind) : loaded.files;
  const crumbs = prefix ? prefix.split("/") : [];
  const nothing = !loading && !error && loaded.folders.length === 0 && files.length === 0 && loaded.pictures.length === 0;
  const isChosen = (key: string) => selected.some((entry) => entry.key === key);
  const importsSelected = images && selected.some((entry) => "file" in entry);
  const title = images ? (max > 1 ? `Choose up to ${max} photos` : "Choose a photo") : max > 1 ? `Choose up to ${max} files` : "Choose a file";

  return (
    <>
      <Modal
        open
        onClose={onClose}
        dismissible={!importing}
        size="lg"
        title={title}
        description={images ? "Pick one from the photo library, or upload a new one." : "Pick a stored file, or upload a new one."}
        className="flex max-h-[85vh] flex-col"
        footer={
          <>
            <span className="mr-auto text-xs text-muted">
              {selected.length} selected{max > 1 ? ` of ${max}` : ""}
              {importsSelected ? " · pictures from other buckets are copied into the photo library" : ""}
            </span>
            <button type="button" onClick={onClose} disabled={importing} className={dashboardButtonClass("ghost")}>
              Cancel
            </button>
            <SpriteButton type="button" onClick={() => void insert(selected)} disabled={selected.length === 0 || importing}>
              {importing ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={15} className="animate-spin" aria-hidden /> Adding…
                </span>
              ) : (
                "Insert"
              )}
            </SpriteButton>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-0 flex-1 basis-56">
            <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.preventDefault();
              }}
              placeholder={inMedia ? "Search photos…" : "Search files…"}
              aria-label={inMedia ? "Search photos" : "Search files"}
              className="h-10 w-full rounded-control border border-line-strong bg-raised pl-10 pr-4 text-sm text-strong outline-none transition-colors duration-150 placeholder:text-muted/70 focus:border-primary"
            />
          </div>
          <button
            type="button"
            onClick={() => setUploading(true)}
            disabled={!images && (!bucket || inMedia)}
            className={dashboardButtonClass("ghost")}
          >
            <Upload size={14} aria-hidden /> Upload
          </button>
        </div>

        {buckets.length > 1 ? (
          <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Buckets">
            {buckets.map((entry) => (
              <button key={entry.id} type="button" aria-pressed={entry.name === bucket} onClick={() => go(entry.name, entry.name === "media" && images && collection ? collection : "")} className={chip(entry.name === bucket)}>
                {entry.label}
                {entry.public ? null : <Lock size={11} aria-label="private" />}
              </button>
            ))}
          </div>
        ) : null}

        {showKinds ? (
          <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="File type">
            {KINDS.map((entry) => (
              <button key={entry.key} type="button" aria-pressed={entry.key === kind} onClick={() => setKind(entry.key)} className={chip(entry.key === kind)}>
                {entry.label}
              </button>
            ))}
          </div>
        ) : null}

        {bucket ? (
          <nav aria-label="Folder" className="mt-3 flex min-w-0 flex-wrap items-center gap-1 text-xs">
            <button type="button" onClick={() => go(bucket, "")} className="font-mono uppercase tracking-[0.14em] text-primary hover:underline">
              {current?.label ?? bucket}
            </button>
            {crumbs.map((segment, index) => (
              <span key={`${index}-${segment}`} className="flex min-w-0 items-center gap-1">
                <ChevronRight size={12} className="text-muted" aria-hidden />
                <button
                  type="button"
                  onClick={() => go(bucket, crumbs.slice(0, index + 1).join("/"))}
                  className={`max-w-[12rem] truncate ${index === crumbs.length - 1 ? "text-strong" : "text-muted hover:text-strong"}`}
                >
                  {segment}
                </button>
              </span>
            ))}
            {current && !current.public && !images ? <span className="ml-2 text-muted">Private bucket: visitors can&apos;t open these links.</span> : null}
          </nav>
        ) : null}

        {error ? (
          <p role="alert" className="mt-3 rounded-card border border-error/50 bg-error/10 px-3 py-2 text-sm text-error">
            {error}
          </p>
        ) : null}

        <div className="mt-4 min-h-[200px] flex-1 overflow-y-auto overscroll-contain pr-1">
          {loading && loaded.folders.length + loaded.files.length + loaded.pictures.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-muted">
              <Loader2 size={20} className="animate-spin" aria-label="Loading" />
            </div>
          ) : nothing ? (
            <p className="py-12 text-center text-sm text-muted">
              {search ? `Nothing here matches “${search}”.` : inMedia && prefix ? "No photos here yet. Upload one." : "Nothing here yet."}
            </p>
          ) : (
            <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 ${loading ? "opacity-60" : ""}`}>
              {loaded.folders.map((folder) => (
                <button
                  key={folder.path}
                  type="button"
                  onClick={() => bucket && go(bucket, folder.path)}
                  className="flex min-w-0 flex-col items-center gap-2 rounded-card border border-line bg-raised p-3 text-center transition-colors duration-150 hover:border-line-strong"
                  title={folder.description}
                >
                  <Folder size={28} className="text-primary" aria-hidden />
                  <span className="w-full truncate text-xs text-strong">{folder.name}</span>
                  {folder.description ? <span className="line-clamp-2 w-full text-[11px] leading-4 text-muted">{folder.description}</span> : null}
                </button>
              ))}
              {loaded.pictures.map((picture) => {
                const key = `p:${picture.path}`;
                const chosen = isChosen(key);
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={chosen}
                    onClick={() => toggle({ key, picture })}
                    onDoubleClick={() => max <= 1 && void insert([{ key, picture }])}
                    className={`relative min-w-0 rounded-card border p-2 text-left transition-colors duration-150 ${chosen ? "border-primary" : "border-line hover:border-line-strong"} bg-raised`}
                  >
                    {chosen ? (
                      <span className="absolute right-3 top-3 z-10 flex size-5 items-center justify-center rounded-full bg-primary text-on-primary">
                        <Check size={13} strokeWidth={3} aria-hidden />
                      </span>
                    ) : null}
                    <span className="relative mb-2 block aspect-square overflow-hidden rounded-control bg-surface">
                      <Image
                        src={picture.image.src}
                        alt={picture.alt}
                        fill
                        sizes="(min-width: 768px) 170px, 45vw"
                        placeholder={picture.image.blurDataURL ? "blur" : "empty"}
                        blurDataURL={picture.image.blurDataURL || undefined}
                        className="object-cover"
                      />
                    </span>
                    <span className="block truncate text-xs text-strong">{picture.alt || picture.name}</span>
                    <span className="block text-[11px] text-muted">
                      {picture.image.width} × {picture.image.height}
                      {inMedia && !prefix ? ` · ${picture.collection}` : ""}
                    </span>
                  </button>
                );
              })}
              {files.map((file) => {
                const key = `f:${bucket}/${file.path}`;
                const chosen = isChosen(key);
                const usable = !images || file.kind === "image";
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={chosen}
                    disabled={!usable}
                    onClick={() => bucket && toggle({ key, file, bucket })}
                    onDoubleClick={() => bucket && usable && max <= 1 && void insert([{ key, file, bucket }])}
                    title={usable ? file.name : "Not a picture"}
                    className={`relative min-w-0 rounded-card border p-2 text-left transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${chosen ? "border-primary" : "border-line hover:border-line-strong"} bg-raised`}
                  >
                    {chosen ? (
                      <span className="absolute right-3 top-3 z-10 flex size-5 items-center justify-center rounded-full bg-primary text-on-primary">
                        <Check size={13} strokeWidth={3} aria-hidden />
                      </span>
                    ) : null}
                    <span className="relative mb-2 flex aspect-square items-center justify-center overflow-hidden rounded-control bg-surface">
                      {file.kind === "image" && file.size > 0 && file.size <= THUMB_LIMIT ? (
                        <Image src={file.publicUrl} alt="" fill sizes="170px" unoptimized loading="lazy" className="object-cover" />
                      ) : (
                        <FileIcon kind={file.kind} size={28} className="text-muted" />
                      )}
                    </span>
                    <span className="block truncate text-xs text-strong">{file.name}</span>
                    <span className="block text-[11px] text-muted">{formatBytes(file.size)}</span>
                  </button>
                );
              })}
            </div>
          )}
          {loaded.nextOffset !== null && !loading ? (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => bucket && void load(bucket, prefix, search, loaded.nextOffset ?? 0)}
                disabled={loadingMore}
                className={dashboardButtonClass("ghost")}
              >
                {loadingMore ? <Loader2 size={15} className="animate-spin" aria-hidden /> : null}
                {loadingMore ? "Loading…" : "Show more"}
              </button>
            </div>
          ) : null}
        </div>
      </Modal>
      <UploadDialog
        open={uploading}
        onClose={() => setUploading(false)}
        bucket={bucket ?? "files"}
        folder={prefix}
        mode={images ? "photo" : "file"}
        collection={uploadCollection}
        onUploaded={onUploaded}
      />
    </>
  );
}
