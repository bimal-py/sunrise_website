"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronRight, Files, FolderPlus, Images, Upload } from "lucide-react";
import { routes } from "@/lib/routes";
import { uploadImage } from "@/features/dashboard/presentation/actions/media";
import { useProgressWhile } from "@/features/dashboard/presentation/components/form-controls";
import { Field, inputClass } from "@/features/dashboard/presentation/components/ui";
import { createFolder, listFolder, removeObjects, uploadFile } from "@/features/file-manager/data/browser-storage";
import {
  BUCKETS,
  bucketLabel,
  cleanPath,
  folderSlug,
  formatBytes,
  groupPictures,
  isPhotoFolder,
  joinPath,
  MAX_FILE_BYTES,
  mergeListings,
  nameFromSrc,
  PAGE_SIZE,
  parentPath,
  PHOTO_FOLDERS,
  photoFolderOf,
  PLACEHOLDER,
  plural,
  SHARE_FOLDER,
  uploadedPicture,
  type BucketId,
  type FileEntry,
  type FolderEntry,
  type Listing,
  type Picture,
} from "@/features/file-manager/domain/entities";
import { deletePicture } from "@/features/file-manager/presentation/actions";
import { FileList } from "@/features/file-manager/presentation/components/file-list";
import { FolderGrid, type FolderTile } from "@/features/file-manager/presentation/components/folder-grid";
import { PhotoDialog } from "@/features/file-manager/presentation/components/photo-dialog";
import { PhotoGrid } from "@/features/file-manager/presentation/components/photo-grid";
import { MAX_PHOTO_BYTES, PHOTO_TYPES, preparePhoto } from "@/features/file-manager/presentation/prepare-photo";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { SpriteButton } from "@/shared/components/ui/sprite-button";

/** What's loaded, and for which folder (`at`: bucket, path and load attempt). */
type Loaded = { at: string; listing?: Listing; error?: string };
type Task = { kind: "upload" | "delete" | "folder"; label: string };
/** Uploads made in this folder, shown first and marked "New" until the folder changes. */
type Recent = { at: string; photos: string[]; files: FileEntry[] };

const NO_RECENT: Recent = { at: "", photos: [], files: [] };
const sectionTitle = "mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted";
const blockClass = "flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-card border border-line bg-surface px-6 py-12 text-center";

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Check your connection and try again.";
}

function hrefFor(bucket: BucketId, path: string): string {
  const params = new URLSearchParams();
  if (bucket !== "media") params.set("bucket", bucket);
  if (path) params.set("path", path);
  const query = params.toString();
  return `${routes.dashboardSection("file-manager")}${query ? `?${query}` : ""}`;
}

/** "12 photos", "100+ files". */
function countLabel(count: number, noun: string, more: boolean): string {
  return more ? `${count}+ ${noun}s` : plural(count, noun);
}

/** At the top of Photos every part of the site gets its folder, even before its first upload. */
function folderTiles(bucket: BucketId, prefix: string, found: FolderEntry[]): FolderTile[] {
  if (bucket === "media" && !prefix) {
    const known = Object.entries(PHOTO_FOLDERS).map(([name, note]) => ({ name, path: name, note }));
    return [...known, ...found.filter((folder) => !isPhotoFolder(folder.name))];
  }
  const inCollection = bucket === "media" && photoFolderOf(prefix)?.view === "sizes";
  return found.map((folder) => (inCollection && folder.name === SHARE_FOLDER ? { ...folder, note: "Share images (1200 × 630), made with each upload" } : folder));
}

function PathBar({ bucket, prefix, onGo }: { bucket: BucketId; prefix: string; onGo: (path: string) => void }) {
  const parts = prefix ? prefix.split("/") : [];
  const crumbs = [{ label: bucketLabel(bucket), path: "" }, ...parts.map((part, index) => ({ label: part, path: parts.slice(0, index + 1).join("/") }))];
  const last = crumbs.length - 1;
  return (
    <nav aria-label="Folder path" className="min-w-0">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 font-mono text-[0.65rem] uppercase tracking-[0.18em]">
        {crumbs.map((crumb, index) =>
          index < last ? (
            <li key={crumb.path} className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onGo(crumb.path)}
                className="inline-flex min-h-8 items-center uppercase tracking-[0.18em] text-muted transition-colors duration-150 hover:text-primary"
              >
                {crumb.label}
              </button>
              <ChevronRight size={11} strokeWidth={2} aria-hidden className="shrink-0 text-muted opacity-60" />
            </li>
          ) : (
            <li key={crumb.path} className="min-w-0 max-w-full">
              <span aria-current="location" className="block truncate py-1.5 text-strong">
                {crumb.label}
              </span>
            </li>
          ),
        )}
      </ol>
    </nav>
  );
}

/**
 * The dashboard's file manager: the "media" bucket as Photos (each processed photo one tile,
 * its sizes grouped) and the "files" bucket as Files (folders, uploads up to 25 MB). The open
 * folder lives in the URL (?bucket=files&path=price-lists), so reload and Back keep it.
 * Listing, file uploads and file deletes run in the browser as the signed-in admin;
 * photos go through uploadImage (sizes built on the server) and their deletes through
 * deletePicture (files plus the media library row).
 */
export function FileManagerView() {
  const params = useSearchParams();
  const bucket: BucketId = params.get("bucket") === "files" ? "files" : "media";
  const prefix = cleanPath(params.get("path") ?? "");
  const here = `${bucket}:${prefix}`;
  const photoFolder = bucket === "media" ? photoFolderOf(prefix) : null;
  const photoCollection = photoFolder?.view === "sizes" && isPhotoFolder(photoFolder.collection) ? photoFolder.collection : null;
  const canUpload = bucket === "files" || photoCollection !== null;

  const [attempt, setAttempt] = useState(0);
  const key = `${here}#${attempt}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [moreBusy, setMoreBusy] = useState(false);
  const [task, setTask] = useState<Task | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [recent, setRecent] = useState<Recent>(NO_RECENT);
  const [open, setOpen] = useState<Picture | null>(null);
  const [folderForm, setFolderForm] = useState<{ value: string; error?: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const listing = loaded?.at === key ? loaded.listing : undefined;
  const loadError = loaded?.at === key ? loaded.error : undefined;
  const loading = loaded?.at !== key;
  const uploading = task?.kind === "upload";
  useProgressWhile(loading || moreBusy || task !== null);

  useEffect(() => {
    let cancelled = false;
    listFolder(bucket, prefix, 0, PAGE_SIZE).then(
      (next) => {
        if (!cancelled) setLoaded({ at: key, listing: next });
      },
      (error: unknown) => {
        if (!cancelled) setLoaded({ at: key, error: messageOf(error) });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [bucket, prefix, key]);

  // Leaving mid-upload would drop the photos still waiting their turn.
  useEffect(() => {
    if (!uploading) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [uploading]);

  function go(nextBucket: BucketId, nextPath: string) {
    setNotice(null);
    setProblems([]);
    setFolderForm(null);
    setOpen(null);
    window.history.pushState(null, "", hrefFor(nextBucket, nextPath));
  }

  /** Reloads this folder after a change, keeping as many entries as were showing. */
  async function refresh() {
    const at = key;
    try {
      const next = await listFolder(bucket, prefix, 0, Math.max(PAGE_SIZE, listing?.rawCount ?? 0));
      setLoaded((current) => (current?.at === at ? { at, listing: next } : current));
    } catch (error) {
      setProblems((current) => [...current, `Couldn't refresh the folder: ${messageOf(error)}`]);
    }
  }

  async function loadMore() {
    if (!listing) return;
    const at = key;
    setMoreBusy(true);
    try {
      const next = await listFolder(bucket, prefix, listing.rawCount, PAGE_SIZE);
      setLoaded((current) => (current?.at === at && current.listing ? { at, listing: mergeListings(current.listing, next) } : current));
    } catch (error) {
      setProblems([`Couldn't load more: ${messageOf(error)}`]);
    } finally {
      setMoreBusy(false);
    }
  }

  function forget({ photo, file }: { photo?: string; file?: string }) {
    setRecent((current) => ({ ...current, photos: current.photos.filter((name) => name !== photo), files: current.files.filter((entry) => entry.path !== file) }));
  }

  /** After uploads: newest first and marked "New", then the folder reloads. */
  function settle(at: string, added: { photos?: string[]; files?: FileEntry[] }, message: string | null, failed: string[]) {
    const photos = [...(added.photos ?? [])].reverse();
    const files = [...(added.files ?? [])].reverse();
    if (photos.length > 0 || files.length > 0) {
      setRecent((current) => {
        const kept = current.at === at ? current : NO_RECENT;
        return { at, photos: [...photos, ...kept.photos], files: [...files, ...kept.files] };
      });
      void refresh();
    }
    setNotice(message);
    setProblems(failed);
  }

  function progressLabel(index: number, total: number, name: string) {
    return total > 1 ? `Uploading ${index + 1} of ${total}: ${name}…` : `Uploading ${name}…`;
  }

  async function uploadPhotos(chosen: File[], collection: string) {
    const at = here;
    const added: string[] = [];
    const failed: string[] = [];
    setNotice(null);
    setProblems([]);
    for (const [index, file] of chosen.entries()) {
      setTask({ kind: "upload", label: progressLabel(index, chosen.length, file.name) });
      if (!PHOTO_TYPES.includes(file.type)) {
        failed.push(`${file.name}: use a JPEG, PNG, WebP or AVIF photo (iPhone HEIC photos: export as JPEG first).`);
        continue;
      }
      try {
        const photo = await preparePhoto(file);
        if (photo.size > MAX_PHOTO_BYTES) {
          failed.push(`${file.name}: too large, even after shrinking. Try a smaller copy (under 4 MB).`);
          continue;
        }
        const body = new FormData();
        body.set("file", photo, file.name.replace(/\.(png|webp)$/i, ".jpg"));
        body.set("collection", collection);
        const result = await uploadImage(body);
        if (result.ok) added.push(nameFromSrc(result.image.src));
        else failed.push(`${file.name}: ${result.error}`);
      } catch {
        failed.push(`${file.name}: the upload failed. Check your connection and try again.`);
      }
    }
    setTask(null);
    settle(at, { photos: added }, added.length > 0 ? `${plural(added.length, "photo")} uploaded to ${collection}.` : null, failed);
  }

  async function uploadFiles(chosen: File[], folder: string) {
    const at = here;
    const added: FileEntry[] = [];
    const failed: string[] = [];
    setNotice(null);
    setProblems([]);
    for (const [index, file] of chosen.entries()) {
      setTask({ kind: "upload", label: progressLabel(index, chosen.length, file.name) });
      if (file.size > MAX_FILE_BYTES) {
        failed.push(`${file.name} is ${formatBytes(file.size)}: the limit is 25 MB a file. Long videos belong on YouTube.`);
        continue;
      }
      try {
        added.push(await uploadFile(folder, file));
      } catch (error) {
        failed.push(`${file.name}: ${messageOf(error)}`);
      }
    }
    setTask(null);
    settle(at, { files: added }, added.length > 0 ? `${plural(added.length, "file")} uploaded.` : null, failed);
  }

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (chosen.length === 0) return;
    if (bucket === "files") void uploadFiles(chosen, prefix);
    else if (photoCollection) void uploadPhotos(chosen, photoCollection);
  }

  /** Resolves to an error for the dialog to show, or null once the photo is gone. */
  async function removePicture(picture: Picture): Promise<string | null> {
    setTask({ kind: "delete", label: `Deleting ${picture.name}…` });
    setNotice(null);
    setProblems([]);
    try {
      const result = await deletePicture(picture.collection, picture.name, picture.widths);
      if (!result.ok) return result.error;
      setOpen(null);
      forget({ photo: picture.name });
      setNotice(`Deleted ${picture.name}.`);
      void refresh();
      return null;
    } catch {
      return "Couldn't delete the photo. Check your connection and try again.";
    } finally {
      setTask(null);
    }
  }

  async function removeFile(file: FileEntry) {
    if (!window.confirm(`Delete ${file.name}? Links to it will stop working. This can't be undone.`)) return;
    setTask({ kind: "delete", label: `Deleting ${file.name}…` });
    setNotice(null);
    setProblems([]);
    try {
      await removeObjects(bucket, [file.path]);
      forget({ file: file.path });
      setNotice(`Deleted ${file.name}.`);
      void refresh();
    } catch (error) {
      setProblems([`Couldn't delete ${file.name}: ${messageOf(error)}`]);
    } finally {
      setTask(null);
    }
  }

  async function removeEmptyFolder() {
    const name = prefix.slice(prefix.lastIndexOf("/") + 1);
    if (!window.confirm(`Delete the empty folder ${name}?`)) return;
    setTask({ kind: "folder", label: `Deleting the folder ${name}…` });
    try {
      await removeObjects("files", [joinPath(prefix, PLACEHOLDER)]);
      go("files", parentPath(prefix));
      setNotice(`Deleted the folder ${name}.`);
    } catch (error) {
      setProblems([`Couldn't delete the folder: ${messageOf(error)}`]);
    } finally {
      setTask(null);
    }
  }

  async function submitFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!folderForm) return;
    const name = folderSlug(folderForm.value);
    const problem = !name
      ? "Use latin letters, digits and hyphens, e.g. price-lists."
      : listing?.folders.some((folder) => folder.name === name)
        ? `There's already a folder called ${name}.`
        : "";
    if (problem) {
      setFolderForm({ ...folderForm, error: problem });
      return;
    }
    setTask({ kind: "folder", label: `Creating the folder ${name}…` });
    try {
      const path = await createFolder(prefix, name);
      go("files", path);
      setNotice(`Created the folder ${name}.`);
    } catch (error) {
      setFolderForm({ ...folderForm, error: `Couldn't create the folder: ${messageOf(error)}` });
    } finally {
      setTask(null);
    }
  }

  // What this folder shows: folders, then photos (or files), this session's uploads first.
  const recentHere = recent.at === here ? recent : NO_RECENT;
  const newPhotos = new Set(recentHere.photos);
  const newFiles = new Set(recentHere.files.map((file) => file.path));
  let folders: FolderTile[] = [];
  let pictures: Picture[] = [];
  let files: FileEntry[] = [];
  if (listing) {
    folders = folderTiles(bucket, prefix, listing.folders);
    if (bucket === "media") {
      const grouped = groupPictures(listing.files, prefix);
      const fresh = photoCollection ? recentHere.photos.map((name) => grouped.pictures.find((picture) => picture.name === name) ?? uploadedPicture(photoCollection, name)) : [];
      pictures = [...fresh, ...grouped.pictures.filter((picture) => !newPhotos.has(picture.name))];
      files = grouped.others;
    } else {
      const fresh = recentHere.files.map((file) => listing.files.find((entry) => entry.path === file.path) ?? file);
      files = [...fresh, ...listing.files.filter((file) => !newFiles.has(file.path))];
    }
  }
  const more = Boolean(listing?.hasMore);
  const pictureNoun = photoFolder?.view === "share" ? "share image" : "photo";
  const summary = pictures.length > 0 ? countLabel(pictures.length, pictureNoun, more) : files.length > 0 ? countLabel(files.length, "file", more) : "";
  const folderName = prefix.slice(prefix.lastIndexOf("/") + 1);

  let hint: ReactNode = null;
  if (bucket === "media" && !prefix) hint = "One folder for each part of the site. Open a folder to see its photos or to upload new ones.";
  else if (photoCollection) hint = "Every upload is kept in three sizes (480, 800 and 1280 px wide) plus a share image, and the site picks the size it needs. Open a photo for its links.";
  else if (photoFolder?.view === "share") hint = `Share images are made with each photo uploaded to ${photoFolder.collection}, for link previews on WhatsApp and Facebook.`;
  else if (bucket === "files")
    hint = (
      <>
        PDFs, price lists and other documents, up to 25 MB each. Names are tidied for links: <span className="whitespace-nowrap">“Price List.pdf”</span> becomes{" "}
        <span className="whitespace-nowrap">price-list.pdf</span>.
      </>
    );

  let content: ReactNode;
  if (!listing) {
    content = loadError ? (
      <div role="alert" className={blockClass}>
        <p className="text-sm text-error">Couldn&apos;t open this folder: {loadError}</p>
        <SpriteButton variant="secondary" onClick={() => setAttempt((count) => count + 1)}>
          Try again
        </SpriteButton>
      </div>
    ) : (
      <div className={blockClass}>
        <p className="text-sm text-muted">Opening the folder…</p>
      </div>
    );
  } else if (folders.length === 0 && pictures.length === 0 && files.length === 0) {
    content =
      bucket === "media" ? (
        <EmptyState title={photoCollection ? `No photos in ${photoCollection} yet` : photoFolder?.view === "share" ? "No share images yet" : "This folder is empty"}>
          {photoCollection
            ? "Upload photos here, or from any photo field in the dashboard: they're saved in this folder."
            : photoFolder?.view === "share"
              ? `They're made with each photo uploaded to ${photoFolder.collection}.`
              : null}
        </EmptyState>
      ) : (
        <EmptyState title={prefix ? "This folder is empty" : "No files yet"}>
          <p>{prefix ? "Upload files into it with the button above." : "Upload a PDF, a price list or any other document, then copy its link to share it."}</p>
          {prefix && listing.placeholder && (
            <button
              type="button"
              onClick={() => void removeEmptyFolder()}
              disabled={task !== null}
              className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-error underline-offset-4 hover:underline disabled:opacity-50"
            >
              Delete the {folderName} folder
            </button>
          )}
        </EmptyState>
      );
  } else {
    content = (
      <>
        {folders.length > 0 && (
          <section aria-labelledby="fm-folders">
            <h2 id="fm-folders" className={sectionTitle}>
              Folders
            </h2>
            <FolderGrid folders={folders} onOpen={(path) => go(bucket, path)} />
          </section>
        )}
        {pictures.length > 0 && (
          <section aria-labelledby="fm-photos">
            <h2 id="fm-photos" className={sectionTitle}>
              {photoFolder?.view === "share" ? "Share images" : "Photos"}
            </h2>
            <PhotoGrid pictures={pictures} isNew={(picture) => newPhotos.has(picture.name)} onOpen={setOpen} />
          </section>
        )}
        {files.length > 0 && (
          <section aria-labelledby="fm-files">
            <h2 id="fm-files" className={sectionTitle}>
              {bucket === "media" ? "Other files" : "Files"}
            </h2>
            <FileList files={files} isNew={(file) => newFiles.has(file.path)} busy={task !== null} onDelete={(file) => void removeFile(file)} />
          </section>
        )}
      </>
    );
  }

  const folderPreview = folderForm ? folderSlug(folderForm.value) : "";

  return (
    <div className="min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label="Storage" className="flex flex-wrap gap-2">
          {BUCKETS.map(({ id, label }) => {
            const active = id === bucket;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => go(id, "")}
                className={`inline-flex h-11 items-center gap-2 rounded-control border px-4 text-sm transition-colors duration-150 ${
                  active ? "border-primary bg-primary-soft text-strong" : "border-line-strong text-foreground hover:border-primary"
                }`}
              >
                {id === "media" ? (
                  <Images className={`h-4 w-4 ${active ? "text-primary" : "text-muted"}`} aria-hidden />
                ) : (
                  <Files className={`h-4 w-4 ${active ? "text-primary" : "text-muted"}`} aria-hidden />
                )}
                {label}
              </button>
            );
          })}
        </div>
        {canUpload && (
          <div className="flex flex-wrap gap-3">
            {bucket === "files" && (
              <SpriteButton variant="secondary" onClick={() => setFolderForm((form) => (form ? null : { value: "" }))} disabled={task !== null}>
                <FolderPlus className="h-4 w-4" aria-hidden /> New folder
              </SpriteButton>
            )}
            <SpriteButton onClick={() => inputRef.current?.click()} disabled={task !== null}>
              <Upload className="h-4 w-4" aria-hidden /> {uploading ? "Uploading…" : bucket === "media" ? "Upload photos" : "Upload files"}
            </SpriteButton>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={bucket === "media" ? PHOTO_TYPES.join(",") : undefined}
          onChange={onPick}
          tabIndex={-1}
          aria-hidden
          className="hidden"
        />
      </div>

      {folderForm && (
        <form onSubmit={(event) => void submitFolder(event)} className="mt-4 rounded-card border border-line bg-surface p-4 sm:p-5">
          <Field
            label="New folder"
            htmlFor="fm-new-folder"
            error={folderForm.error}
            hint={folderPreview ? `It will be called ${folderPreview}.` : "Latin letters, digits and hyphens, e.g. price-lists."}
          >
            <input
              id="fm-new-folder"
              value={folderForm.value}
              onChange={(event) => setFolderForm({ value: event.target.value })}
              autoFocus
              autoComplete="off"
              placeholder="price-lists"
              aria-invalid={folderForm.error ? true : undefined}
              className={inputClass}
            />
          </Field>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <SpriteButton type="submit" disabled={task !== null}>
              {task?.kind === "folder" ? "Creating…" : "Create folder"}
            </SpriteButton>
            <button type="button" onClick={() => setFolderForm(null)} className="inline-flex min-h-11 items-center text-sm text-muted transition-colors duration-150 hover:text-strong">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <PathBar bucket={bucket} prefix={prefix} onGo={(path) => go(bucket, path)} />
        {summary && <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">{summary}</p>}
      </div>
      {hint && <p className="mt-1 max-w-3xl text-sm text-muted">{hint}</p>}

      <div role="status" className="text-sm">
        {task && <p className="mt-3 text-muted">{task.label}</p>}
        {notice && <p className="mt-3 text-success">{notice}</p>}
      </div>
      <div role="alert" className="text-sm text-error">
        {problems.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1">
            {problems.map((problem, index) => (
              <li key={`${index}-${problem}`}>{problem}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-8">{content}</div>

      {more && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={moreBusy}
            className="inline-flex min-h-11 items-center px-4 text-sm font-medium text-primary transition-colors duration-150 hover:text-primary-strong disabled:opacity-60"
          >
            {moreBusy ? "Loading…" : "Show more"}
          </button>
        </div>
      )}

      {open && <PhotoDialog picture={open} busy={task !== null} onClose={() => setOpen(null)} onDelete={removePicture} />}
    </div>
  );
}
