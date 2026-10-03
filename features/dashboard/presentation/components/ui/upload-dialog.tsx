"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type DragEvent } from "react";
import { Check, CircleAlert, Loader2, Plus, Upload, X } from "lucide-react";
import type { MediaCollection } from "@/lib/media/process-image";
import type { ImageAsset } from "@/shared/domain/image";
import { SpriteButton } from "@/shared/components/ui/sprite-button";
import { fileKind, formatBytes, MAX_FILE_BYTES, PHOTO_FOLDERS } from "@/features/file-manager/domain/entities";
import { createSignedUploadAction } from "@/features/file-manager/presentation/actions";
import { dashboardButtonClass } from "./button-classes";
import { DashboardInput } from "./dashboard-ui";
import { FileIcon } from "./file-icon";
import { Modal } from "./modal";
import { PHOTO_ACCEPT, photoProblem, uploadPhoto } from "./photo-prep";
import { useProgressWhile } from "./use-progress-while";

/** What an upload made: a processed photo (photo mode) or a stored file (file mode). */
export type UploadedItem =
  | { kind: "image"; name: string; image: ImageAsset; alt: string }
  | { kind: "file"; name: string; bucket: string; path: string; url: string; size: number; type: string };

type Status = "ready" | "working" | "done" | "failed";
type Item = { id: string; file: File; preview: string | null; alt: string; status: Status; progress: number | null; note: string; result?: UploadedItem };

type UploadDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Where files go (file mode). Ignored for photos, which always go to "media". */
  bucket: string;
  /** Folder inside the bucket (file mode). */
  folder: string;
  /** "photo": shrunk in the browser, then the site's sizes are built (uploadImage). "file": stored as it is. */
  mode: "photo" | "file";
  /** The photo folder (photo mode). */
  collection?: MediaCollection;
  /** Called once per run with what was uploaded (only the successes). */
  onUploaded: (results: UploadedItem[]) => void;
};

class PutError extends Error {
  readonly network: boolean;
  constructor(message: string, network = false) {
    super(message);
    this.network = network;
  }
}

/** Why Storage refused an upload, in words. */
function putProblem(status: number, body: string): string {
  if (status === 413 || /too large|exceeded the maximum/i.test(body)) return "it's over the size limit.";
  if (/mime type|not supported/i.test(body)) return "that kind of file isn't allowed there.";
  if (/already exists|duplicate/i.test(body)) return "a file with that name appeared meanwhile. Try again.";
  if (status === 400 && /signature|token|expired|jwt/i.test(body)) return "the upload link ran out. Try again.";
  return `Storage answered ${status || "nothing"}.`;
}

/** Sends one file to its one-time upload link, reporting progress (Storage's own client can't). */
function putFile(signedUrl: string, file: File, onProgress: (fraction: number) => void, indexable: boolean, xhrRef: { current: XMLHttpRequest | null }): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("x-upsert", "false");
    // Storage answers "X-Robots-Tag: none" unless told otherwise at upload, which hides files from search engines.
    if (indexable) xhr.setRequestHeader("x-robots-tag", "all");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      xhrRef.current = null;
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new PutError(putProblem(xhr.status, xhr.responseText)));
    };
    xhr.onerror = () => {
      xhrRef.current = null;
      reject(new PutError("the connection dropped.", true));
    };
    xhr.onabort = () => {
      xhrRef.current = null;
      reject(new PutError("stopped."));
    };
    const body = new FormData();
    body.append("cacheControl", "31536000");
    body.append("", file);
    xhr.send(body);
  });
}

/**
 * The portfolio's upload dialog: pick or drop several files, see each one's progress and
 * result, remove any before sending. Photos are shrunk in the browser and turned into the
 * site's sizes on the server; files go straight from the browser to Storage through a
 * one-time link (up to 25 MB each), never over an existing file.
 */
export function UploadDialog(props: UploadDialogProps) {
  if (!props.open) return null;
  return <UploadDialogBody {...props} />;
}

function UploadDialogBody({ onClose, bucket, folder, mode, collection, onUploaded }: UploadDialogProps) {
  const photos = mode === "photo";
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [summary, setSummary] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const previews = useRef(new Set<string>());
  const stopRef = useRef(false);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  useProgressWhile(busy);

  // Object URLs for the previews are released when the dialog goes (it can't close mid-upload); a drop
  // outside the drop zone never opens the file in the tab.
  useEffect(() => {
    const urls = previews.current;
    const keepFiles = (event: globalThis.DragEvent) => {
      if (event.dataTransfer?.types.includes("Files")) event.preventDefault();
    };
    window.addEventListener("dragover", keepFiles);
    window.addEventListener("drop", keepFiles);
    return () => {
      window.removeEventListener("dragover", keepFiles);
      window.removeEventListener("drop", keepFiles);
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  const update = (id: string, patch: Partial<Item>) => setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const addFiles = (list: FileList | File[] | null) => {
    if (!list || busy) return;
    const added: Item[] = [];
    const refused: string[] = [];
    for (const file of Array.from(list)) {
      const problem = photos ? photoProblem(file) : file.size > MAX_FILE_BYTES ? "it's over the 25 MB limit." : file.size === 0 ? "it's empty." : null;
      if (problem) {
        refused.push(`${file.name}: ${problem}`);
        continue;
      }
      const preview = file.type.startsWith("image/") && file.size < 30_000_000 ? URL.createObjectURL(file) : null;
      if (preview) previews.current.add(preview);
      added.push({ id: crypto.randomUUID(), file, preview, alt: "", status: "ready", progress: null, note: "" });
    }
    setSkipped(refused);
    setSummary("");
    setItems((current) => [...current, ...added]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeItem = (id: string) => {
    setItems((current) => {
      const item = current.find((entry) => entry.id === id);
      if (item?.preview) {
        URL.revokeObjectURL(item.preview);
        previews.current.delete(item.preview);
      }
      return current.filter((entry) => entry.id !== id);
    });
  };

  async function uploadOne(item: Item): Promise<UploadedItem> {
    if (photos) {
      if (!collection) throw new Error("no photo folder was chosen.");
      update(item.id, { note: "Shrinking and uploading…" });
      const result = await uploadPhoto(item.file, collection, item.alt.trim());
      if (!result.ok) throw new Error(result.error);
      return { kind: "image", name: item.file.name, image: result.image, alt: item.alt.trim() };
    }
    update(item.id, { note: "Starting…", progress: 0 });
    const signed = await createSignedUploadAction(bucket, folder, item.file.name, item.file.size, item.file.type);
    if (!signed.ok) throw new Error(signed.error);
    const onProgress = (fraction: number) => update(item.id, { progress: fraction, note: `${Math.round(fraction * 100)}%` });
    try {
      await putFile(signed.signedUrl, item.file, onProgress, true, xhrRef);
    } catch (error) {
      // If the browser refused the extra header (a strict proxy), send it plainly once more.
      if (!(error instanceof PutError && error.network) || stopRef.current) throw error;
      const retry = await createSignedUploadAction(bucket, folder, item.file.name, item.file.size, item.file.type);
      if (!retry.ok) throw new Error(retry.error);
      await putFile(retry.signedUrl, item.file, onProgress, false, xhrRef);
      return { kind: "file", name: retry.path.slice(retry.path.lastIndexOf("/") + 1), bucket, path: retry.path, url: retry.url, size: item.file.size, type: item.file.type };
    }
    return { kind: "file", name: signed.path.slice(signed.path.lastIndexOf("/") + 1), bucket, path: signed.path, url: signed.url, size: item.file.size, type: item.file.type };
  }

  async function start() {
    const queue = items.filter((item) => item.status === "ready" || item.status === "failed");
    if (queue.length === 0 || busy) return;
    setBusy(true);
    setSummary("");
    stopRef.current = false;
    const results: UploadedItem[] = [];
    let failed = 0;
    for (const [index, item] of queue.entries()) {
      if (stopRef.current) break;
      setSummary(`Uploading ${index + 1} of ${queue.length}…`);
      update(item.id, { status: "working", note: "", progress: null });
      try {
        const result = await uploadOne(item);
        results.push(result);
        update(item.id, { status: "done", note: "Uploaded", progress: 1, result });
      } catch (error) {
        failed++;
        const reason = error instanceof Error ? error.message : "it didn't upload.";
        update(item.id, { status: "failed", note: `Not uploaded: ${reason}`, progress: null });
      }
    }
    const stopped = stopRef.current;
    setBusy(false);
    if (results.length > 0) onUploaded(results);
    if (failed === 0 && !stopped) {
      onClose();
      return;
    }
    const done = `${results.length} uploaded`;
    setSummary(stopped ? `${done}; stopped before the rest.` : `${done}, ${failed} not. Fix or remove ${failed === 1 ? "it" : "them"} and try again.`);
  }

  const stop = () => {
    stopRef.current = true;
    xhrRef.current?.abort();
  };

  const pending = items.filter((item) => item.status === "ready" || item.status === "failed").length;
  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    addFiles(event.dataTransfer.files);
  };
  const dragHandlers = {
    onDragEnter: (event: DragEvent) => {
      if (event.dataTransfer.types.includes("Files")) setDragging(true);
    },
    onDragOver: (event: DragEvent) => {
      if (event.dataTransfer.types.includes("Files")) event.preventDefault();
    },
    onDragLeave: (event: DragEvent) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
    },
    onDrop,
  };

  const where = photos
    ? `Into ${collection ? `the “${collection}” photo folder (${(PHOTO_FOLDERS as Record<string, string>)[collection]?.toLowerCase() ?? "photos"})` : "the photo library"}. Big photos are shrunk first, and the site's sizes are made for you.`
    : `Into ${bucket}${folder ? ` / ${folder}` : ""}. Any kind of file, up to 25 MB each.`;

  return (
    <Modal
      open
      onClose={onClose}
      dismissible={!busy}
      title={photos ? "Upload photos" : "Upload files"}
      description={where}
      size={items.length > 0 ? "lg" : "md"}
      footer={
        <>
          <span role="status" aria-live="polite" className="mr-auto text-xs text-muted">
            {summary || (pending > 0 ? `${pending} ${photos ? "photo" : "file"}${pending === 1 ? "" : "s"} ready` : "")}
          </span>
          {busy ? (
            <button type="button" onClick={stop} className={dashboardButtonClass("ghost")}>
              Stop
            </button>
          ) : (
            <button type="button" onClick={onClose} className={dashboardButtonClass("ghost")}>
              {items.some((item) => item.status === "done") ? "Close" : "Cancel"}
            </button>
          )}
          <SpriteButton type="button" onClick={() => void start()} disabled={busy || pending === 0}>
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={15} className="animate-spin" aria-hidden /> Uploading…
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <Upload size={15} aria-hidden /> Upload
              </span>
            )}
          </SpriteButton>
        </>
      }
    >
      <input ref={inputRef} type="file" multiple accept={photos ? PHOTO_ACCEPT : undefined} className="hidden" tabIndex={-1} onChange={(event) => addFiles(event.target.files)} />

      <div {...dragHandlers} className="min-w-0">
        {items.length === 0 ? (
          <button
            type="button"
            data-autofocus
            onClick={() => inputRef.current?.click()}
            className={`flex w-full flex-col items-center justify-center gap-3 rounded-card border border-dashed px-6 py-12 text-center transition-colors duration-150 hover:border-primary ${dragging ? "border-primary bg-primary-soft" : "border-line-strong bg-raised"}`}
          >
            <Upload size={24} className="text-primary" aria-hidden />
            <span className="text-sm font-medium text-strong">{photos ? "Choose photos" : "Choose files"}</span>
            <span className="text-xs text-muted">or drag them here</span>
          </button>
        ) : (
          <ul className={`flex max-h-[50vh] flex-col gap-2.5 overflow-y-auto rounded-card pr-1 ${dragging ? "outline outline-1 outline-primary" : ""}`}>
            {items.map((item) => (
              <li key={item.id} className="flex min-w-0 items-start gap-3 rounded-card border border-line-strong bg-raised p-2.5">
                <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-control bg-surface">
                  {item.preview ? (
                    <Image src={item.preview} alt="" fill sizes="48px" unoptimized className="object-cover" />
                  ) : (
                    <FileIcon kind={fileKind({ type: item.file.type, name: item.file.name })} size={20} className="text-primary" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-strong">{item.file.name}</p>
                  <p className={`mt-0.5 flex items-start gap-1.5 text-xs leading-5 [&>svg]:mt-1 ${item.status === "failed" ? "text-error" : "text-muted"}`}>
                    {item.status === "working" ? <Loader2 size={12} className="shrink-0 animate-spin" aria-hidden /> : null}
                    {item.status === "done" ? <Check size={12} className="shrink-0 text-success" aria-hidden /> : null}
                    {item.status === "failed" ? <CircleAlert size={12} className="shrink-0" aria-hidden /> : null}
                    <span className="min-w-0">{item.note || formatBytes(item.file.size)}</span>
                  </p>
                  {item.status === "working" && item.progress !== null ? (
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface" aria-hidden>
                      <div className="h-full bg-primary transition-[width] duration-150" style={{ width: `${Math.round(item.progress * 100)}%` }} />
                    </div>
                  ) : null}
                  {photos && (item.status === "ready" || item.status === "failed") ? (
                    <DashboardInput
                      value={item.alt}
                      onChange={(event) => update(item.id, { alt: event.target.value })}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") event.preventDefault();
                      }}
                      maxLength={300}
                      placeholder="Describe the photo (optional, helps search and screen readers)"
                      aria-label={`Description of ${item.file.name}`}
                      className="mt-2 py-1.5 text-xs"
                    />
                  ) : null}
                </div>
                {item.status !== "working" && item.status !== "done" ? (
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    disabled={busy}
                    aria-label={`Remove ${item.file.name}`}
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors duration-150 hover:text-error disabled:opacity-50"
                  >
                    <X size={16} aria-hidden />
                  </button>
                ) : null}
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-card border border-dashed border-line-strong py-2.5 text-sm text-muted transition-colors duration-150 hover:border-primary hover:text-primary disabled:opacity-50"
              >
                <Plus size={15} aria-hidden /> {photos ? "Add more photos" : "Add more files"}
              </button>
            </li>
          </ul>
        )}
        {skipped.length > 0 ? (
          <div role="alert" className="mt-3 rounded-card border border-error/50 bg-error/10 px-3 py-2 text-xs leading-5 text-error">
            <p className="font-medium">{skipped.length === 1 ? "One file was left out:" : `${skipped.length} files were left out:`}</p>
            <ul className="mt-1 list-disc pl-4">
              {skipped.slice(0, 6).map((line) => (
                <li key={line} className="break-words">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
