"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { plural, type StorageBucket } from "@/features/file-manager/domain/entities";
import { listFolderTreeAction } from "@/features/file-manager/presentation/actions";
import { dashboardButtonClass } from "@/features/dashboard/presentation/components/ui/button-classes";
import { DashboardField, DashboardSelect } from "@/features/dashboard/presentation/components/ui/dashboard-ui";
import { Modal } from "@/features/dashboard/presentation/components/ui/modal";
import { useProgressWhile } from "@/features/dashboard/presentation/components/ui/use-progress-while";
import { SpriteButton } from "@/shared/components/ui/sprite-button";

/** The select's value for the bucket's top level ("" is "nothing chosen yet"). */
const TOP = "/";

type Tree = { paths: string[]; complete: boolean; error?: string };

/**
 * "Move to folder", as on the portfolio: one select of destinations and "Move here". Unlike
 * the portfolio it offers every folder in the bucket (loaded when it opens; the open folder's
 * own subfolders show at once), never the moved folders themselves or anything inside them.
 */
export function MoveDialog({
  open,
  bucket,
  prefix,
  paths,
  folderPaths,
  pending,
  error,
  onClose,
  onMove,
}: {
  open: boolean;
  bucket: StorageBucket | null;
  /** The folder the items are in now. */
  prefix: string;
  /** What's being moved. */
  paths: string[];
  /** Folders already known (the open folder's subfolders), shown while the full list loads. */
  folderPaths: string[];
  pending: boolean;
  error: string;
  onClose: () => void;
  /** "" = the top level. */
  onMove: (destination: string) => void;
}) {
  return (
    <Modal
      open={open && bucket !== null}
      onClose={onClose}
      title="Move to folder"
      description={paths.length === 1 ? `Moving “${paths[0].slice(paths[0].lastIndexOf("/") + 1)}”.` : `Moving ${plural(paths.length, "item")}.`}
      size="sm"
      dismissible={!pending}
    >
      {bucket ? <MoveForm bucket={bucket} prefix={prefix} paths={paths} folderPaths={folderPaths} pending={pending} error={error} onClose={onClose} onMove={onMove} /> : null}
    </Modal>
  );
}

function MoveForm({
  bucket,
  prefix,
  paths,
  folderPaths,
  pending,
  error,
  onClose,
  onMove,
}: {
  bucket: StorageBucket;
  prefix: string;
  paths: string[];
  folderPaths: string[];
  pending: boolean;
  error: string;
  onClose: () => void;
  onMove: (destination: string) => void;
}) {
  const [tree, setTree] = useState<Tree | null>(null);
  const [choice, setChoice] = useState("");
  useProgressWhile(pending || tree === null);

  // The whole bucket's folders, once per opening (the form mounts with the dialog).
  useEffect(() => {
    let cancelled = false;
    listFolderTreeAction(bucket.name)
      .catch(() => ({ ok: false as const, error: "Couldn't reach the server." }))
      .then((result) => {
        if (cancelled) return;
        setTree(result.ok ? result.data : { paths: [], complete: false, error: result.error });
      });
    return () => {
      cancelled = true;
    };
  }, [bucket.name]);

  // Known at once: the open folder's subfolders and the folders above it.
  const ancestors = prefix ? prefix.split("/").map((_, index, parts) => parts.slice(0, index + 1).join("/")) : [];
  const known = tree && !tree.error ? tree.paths : [...new Set([...ancestors, ...folderPaths])].sort((a, b) => a.localeCompare(b));
  const blocked = (path: string) => paths.some((moved) => path === moved || path.startsWith(`${moved}/`));
  const parents = new Set(paths.map((path) => (path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "")));
  // Everything already sits in one folder: moving there would change nothing.
  const here = parents.size === 1 ? [...parents][0] : null;
  const options = known.filter((path) => !blocked(path));
  const destination = choice === TOP ? "" : choice;
  const usable = choice !== "" && destination !== here;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pending && usable) onMove(destination);
  };

  return (
    <form noValidate onSubmit={submit} className="grid gap-5">
      <DashboardField
        label="Destination folder"
        hint={
          tree === null ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 size={12} className="animate-spin" aria-hidden /> Finding every folder…
            </span>
          ) : tree.error ? (
            `Only nearby folders are listed: ${tree.error}`
          ) : tree.complete ? (
            "Every folder in this bucket."
          ) : (
            `The first ${tree.paths.length} folders of this bucket.`
          )
        }
      >
        <DashboardSelect data-autofocus value={choice} onChange={(event) => setChoice(event.target.value)} disabled={pending}>
          <option value="" disabled>
            Choose a folder…
          </option>
          <option value={TOP} disabled={here === ""}>
            {bucket.label} (top level){here === "" ? " · here now" : ""}
          </option>
          {options.map((path) => (
            <option key={path} value={path} disabled={path === here}>
              {path}
              {path === here ? " · here now" : ""}
            </option>
          ))}
        </DashboardSelect>
      </DashboardField>
      {error ? (
        <p role="alert" className="text-sm leading-6 text-error">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <button type="button" onClick={onClose} disabled={pending} className={dashboardButtonClass("ghost")}>
          Cancel
        </button>
        <SpriteButton type="submit" disabled={pending || !usable}>
          {pending ? (
            <>
              <Loader2 size={15} className="animate-spin" aria-hidden />
              Moving…
            </>
          ) : (
            "Move here"
          )}
        </SpriteButton>
      </div>
    </form>
  );
}
