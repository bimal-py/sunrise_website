"use client";

import Image from "next/image";
import { ArrowUpRight, File as FileIcon, FileArchive, FileAudio, FileImage, FileSpreadsheet, FileText, FileVideo, type LucideIcon } from "lucide-react";
import { formatDate } from "@/lib/utils/date";
import { rowLinkClass, StatusBadge } from "@/features/dashboard/presentation/components/ui";
import { fileKind, formatBytes, type FileEntry, type FileKind } from "@/features/file-manager/domain/entities";
import { CopyButton } from "@/features/file-manager/presentation/components/copy-button";

const ICONS: Record<FileKind, LucideIcon> = {
  image: FileImage,
  video: FileVideo,
  audio: FileAudio,
  pdf: FileText,
  sheet: FileSpreadsheet,
  archive: FileArchive,
  other: FileIcon,
};

/** Small images show themselves; anything else (or a big image, to spare mobile data) shows its kind. */
function FileThumb({ file }: { file: FileEntry }) {
  const kind = fileKind(file);
  if (kind === "image" && file.size <= 2_000_000) {
    return (
      <span className="relative size-10 shrink-0 overflow-hidden rounded-control bg-raised">
        <Image src={file.url} alt="" fill unoptimized sizes="40px" className="object-cover" />
      </span>
    );
  }
  const Icon = ICONS[kind];
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-raised text-primary">
      <Icon className="h-5 w-5" aria-hidden />
    </span>
  );
}

/** Files as rows: name, size and date, then Copy link, Open and Delete. */
export function FileList({ files, isNew, busy, onDelete }: { files: FileEntry[]; isNew: (file: FileEntry) => boolean; busy: boolean; onDelete: (file: FileEntry) => void }) {
  return (
    <ul className="divide-y divide-line rounded-panel border border-line bg-surface">
      {files.map((file) => (
        <li key={file.path} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <FileThumb file={file} />
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <p className="truncate text-sm font-medium text-strong" title={file.name}>
                  {file.name}
                </p>
                {isNew(file) && <StatusBadge tone="gold">New</StatusBadge>}
              </div>
              <p className="font-mono text-xs text-muted">{[formatBytes(file.size), file.updatedAt && formatDate(file.updatedAt)].filter(Boolean).join(" · ")}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 pl-[52px] sm:shrink-0 sm:pl-0">
            <CopyButton text={file.url} ariaLabel={`Copy the link to ${file.name}`} />
            <a href={file.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${file.name}`} className={rowLinkClass}>
              Open <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </a>
            <button
              type="button"
              onClick={() => onDelete(file)}
              disabled={busy}
              aria-label={`Delete ${file.name}`}
              className="inline-flex min-h-8 items-center text-sm font-medium text-error underline-offset-4 transition-opacity duration-150 hover:underline disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
