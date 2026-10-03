"use client";

import { useState } from "react";
import { ArrowUpRight, FolderOpen, X } from "lucide-react";
import { supabaseUrl } from "@/lib/supabase/env";
import { dashboardButtonClass } from "@/features/dashboard/presentation/components/ui/button-classes";
import { DashboardCheckbox, DashboardField, DashboardInput, DashboardTextarea } from "@/features/dashboard/presentation/components/ui/dashboard-ui";
import { FileIcon } from "@/features/dashboard/presentation/components/ui/file-icon";
import { FilePickerDialog } from "@/features/dashboard/presentation/components/ui/file-picker-dialog";
import { fileKind } from "@/features/file-manager/domain/entities";
import { DEFAULT_ROOT_FILE_TYPE, ROOT_FILE_BUCKET, ROOT_FILE_MAX_BODY, ROOT_FILE_NAME, rootFileTypeFor } from "@/features/root-files/domain/root-file";
import { ContentTypeField } from "./content-type-field";

export type RootFileValues = { file_name: string; content_type: string; body: string; storage_path: string | null; published: boolean; note: string };

/** The public link of an object in the files bucket. */
function fileUrl(path: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${ROOT_FILE_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

/**
 * The root file's fields, as on the portfolio: name and content type, a note, an optional
 * uploaded file (chosen from the Files bucket, or uploaded there, through the file picker)
 * and the text. Choosing a file fills in an empty name and matches the content type to it.
 */
export function RootFileFields({ file }: { file: RootFileValues | null }) {
  const [name, setName] = useState(file?.file_name ?? "");
  const [storagePath, setStoragePath] = useState(file?.storage_path ?? "");
  const [contentType, setContentType] = useState(file?.content_type ?? DEFAULT_ROOT_FILE_TYPE);
  // Bumped when choosing a file sets the content type, so the picker starts again with it.
  const [typeVersion, setTypeVersion] = useState(0);
  const [picking, setPicking] = useState(false);
  const [note, setNote] = useState("");
  const [problem, setProblem] = useState("");
  const uploadedName = storagePath.split("/").pop() ?? "";

  return (
    <>
      <div className="grid gap-5 md:grid-cols-2">
        <DashboardField
          label="File name"
          required
          help="Exactly as the service names it, with its extension. No folders: it's served at the top of the site."
          example="google1234abcd.html"
          hint={ROOT_FILE_NAME.test(name) ? `Served at /${name}` : undefined}
        >
          <DashboardInput
            name="file_name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={109}
            placeholder="example: ads.txt"
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            className="font-mono"
          />
        </DashboardField>
        <DashboardField
          as="div"
          label="Content type"
          required
          help="The kind of file, sent to browsers and crawlers with it. Pick the one that matches the extension, or Other to type a MIME type."
          example="text/plain; charset=utf-8"
        >
          <ContentTypeField key={typeVersion} defaultValue={contentType} onChange={setContentType} />
        </DashboardField>
      </div>

      <DashboardField label="Note" help="What the file is for, for you. It isn't published." example="Google Search Console verification">
        <DashboardInput name="note" defaultValue={file?.note ?? ""} maxLength={300} placeholder="Short note (optional)" />
      </DashboardField>

      <DashboardField
        as="div"
        label="Uploaded file"
        help="Optional. For a file you upload rather than type (a PDF, an image): it's served as it is at the address above, instead of the text below. Choose it from the Files bucket, or upload it there from the picker."
        example="price-list.pdf"
        error={problem || undefined}
        hint={note || undefined}
      >
        <input type="hidden" name="storage_path" value={storagePath} />
        {storagePath ? (
          <div className="flex min-w-0 flex-wrap items-center gap-3 rounded-card border border-line-strong bg-raised p-3">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-control border border-line-strong text-primary">
              <FileIcon kind={fileKind({ type: "", name: uploadedName })} size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="break-all text-sm font-medium text-strong">{uploadedName}</p>
              <p className="break-all font-mono text-xs text-muted">
                {ROOT_FILE_BUCKET}/{storagePath}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a href={fileUrl(storagePath)} target="_blank" rel="noopener noreferrer" className={dashboardButtonClass("ghost", "px-3")}>
                Open <ArrowUpRight size={15} aria-hidden />
              </a>
              <button type="button" onClick={() => setPicking(true)} className={dashboardButtonClass("ghost", "px-3")}>
                Change
              </button>
              <button
                type="button"
                onClick={() => {
                  setStoragePath("");
                  setProblem("");
                  setNote("The text below will be served again once you save.");
                }}
                className={dashboardButtonClass("danger", "px-3")}
              >
                <X size={15} aria-hidden /> Remove
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setPicking(true)} className={dashboardButtonClass("ghost")}>
            <FolderOpen size={15} aria-hidden /> Choose or upload a file
          </button>
        )}
      </DashboardField>

      <DashboardField
        label="Contents"
        help="The file's text, served exactly as written. Paste what the service gave you."
        example="google-site-verification: google1234abcd.html"
        hint={storagePath ? "Not served while an uploaded file is chosen; kept in case you remove the file." : undefined}
      >
        <DashboardTextarea
          name="body"
          rows={14}
          maxLength={ROOT_FILE_MAX_BODY}
          defaultValue={file?.body ?? ""}
          placeholder="Plain text file content"
          spellCheck={false}
          className="font-mono text-[13px]"
        />
      </DashboardField>

      <DashboardCheckbox
        name="published"
        label="Published"
        defaultChecked={file?.published ?? true}
        hint="Untick to take the file down without deleting it (its address then answers “not found”)."
      />

      <FilePickerDialog
        open={picking}
        onClose={() => setPicking(false)}
        mode="file"
        onPick={(result) => {
          if (result.kind !== "file") return;
          if (result.bucket !== ROOT_FILE_BUCKET) {
            setProblem("Choose a file in the Files bucket: root files are served from there.");
            return;
          }
          const base = result.path.split("/").pop() ?? "";
          const changes: string[] = [];
          setStoragePath(result.path);
          setProblem("");
          if (!name.trim() && ROOT_FILE_NAME.test(base)) {
            setName(base);
            changes.push("its name");
          }
          const type = rootFileTypeFor(base);
          if (type && type !== contentType) {
            setContentType(type);
            setTypeVersion((version) => version + 1);
            changes.push("the content type");
          }
          setNote(changes.length > 0 ? `Filled in ${changes.join(" and ")} from the file. Check them before saving.` : "");
        }}
      />
    </>
  );
}
