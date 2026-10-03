"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { ArrowUpRight, Link2, Loader2 } from "lucide-react";
import { formatBytes, type StorageBucket, type StorageFile, type StoragePicture } from "@/features/file-manager/domain/entities";
import { DashboardButton } from "@/features/dashboard/presentation/components/ui/dashboard-button";
import { fieldLabelClass } from "@/features/dashboard/presentation/components/ui/dashboard-ui";
import { FileIcon } from "@/features/dashboard/presentation/components/ui/file-icon";
import { Modal } from "@/features/dashboard/presentation/components/ui/modal";
import { SpriteButton } from "@/shared/components/ui/sprite-button";
import { drawable, pictureLinks, PREVIEW_LIMIT, shortDate, type Item } from "./file-manager-model";

const CHIP =
  "inline-flex min-h-8 items-center gap-1 rounded-full border border-line-strong px-3 font-mono text-xs text-foreground transition-colors duration-150 hover:border-primary hover:text-primary";

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 pt-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">{label}</dt>
      <dd className="min-w-0 text-right text-strong [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

function PictureDetails({ picture }: { picture: StoragePicture }) {
  const links = pictureLinks(picture);
  return (
    <>
      <div className="relative mb-5 flex aspect-video items-center justify-center overflow-hidden rounded-card border border-line bg-raised">
        <Image
          src={links.preview}
          alt={picture.alt}
          fill
          unoptimized
          sizes="(min-width: 640px) 560px, 100vw"
          placeholder={picture.image.blurDataURL ? "blur" : "empty"}
          blurDataURL={picture.image.blurDataURL || undefined}
          className="object-contain"
        />
      </div>
      <dl className="space-y-2.5 text-sm">
        <Detail label="Name">{picture.name}</Detail>
        <Detail label="Description">{picture.alt || "—"}</Detail>
        <Detail label="Size">
          {picture.image.width} × {picture.image.height} px{picture.bytes > 0 ? ` · ${formatBytes(picture.bytes)}` : ""}
        </Detail>
        <Detail label="Folder">{picture.collection}</Detail>
        <Detail label="Added">{shortDate(picture.createdAt) || "—"}</Detail>
      </dl>
      <div className="mt-5">
        <p className={fieldLabelClass}>Files</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {links.widths.map((width) => (
            <li key={width}>
              <a href={links.size(width)} target="_blank" rel="noopener noreferrer" className={CHIP}>
                {width} px <ArrowUpRight size={13} aria-hidden />
              </a>
            </li>
          ))}
          <li>
            <a href={links.share} target="_blank" rel="noopener noreferrer" className={CHIP}>
              Share image · 1200 × 630 <ArrowUpRight size={13} aria-hidden />
            </a>
          </li>
        </ul>
        <p className="mt-2 text-xs leading-5 text-muted">
          The site picks the size it needs. Copy link gives the {links.fileWidth} px file, which opens anywhere and works in any photo field.
          {picture.inStorage ? "" : " This photo ships with the site's code, so it can be used but not deleted here."}
        </p>
      </div>
    </>
  );
}

function FileDetails({ file, bucket }: { file: StorageFile; bucket: StorageBucket }) {
  const preview = bucket.public && drawable(file) && file.size > 0 && file.size <= PREVIEW_LIMIT;
  const folder = file.path.includes("/") ? file.path.slice(0, file.path.lastIndexOf("/")) : "";
  return (
    <>
      <div className="relative mb-5 flex aspect-video flex-col items-center justify-center gap-2 overflow-hidden rounded-card border border-line bg-raised p-4 text-center">
        {preview ? (
          <Image src={file.publicUrl} alt="" fill unoptimized sizes="(min-width: 640px) 560px, 100vw" className="object-contain" />
        ) : (
          <>
            <FileIcon kind={file.kind} size={48} className="text-muted" />
            {file.kind === "image" && file.size > PREVIEW_LIMIT ? <p className="text-xs text-muted">A large picture ({formatBytes(file.size)}): open it to see it.</p> : null}
          </>
        )}
      </div>
      <dl className="space-y-2.5 text-sm">
        <Detail label="Name">{file.name}</Detail>
        <Detail label="Type">{file.mimeType ?? "—"}</Detail>
        <Detail label="Size">{formatBytes(file.size)}</Detail>
        <Detail label="Updated">{shortDate(file.updatedAt) || "—"}</Detail>
        <Detail label="Folder">{folder ? `${bucket.label} / ${folder}` : bucket.label}</Detail>
      </dl>
      {bucket.public ? null : <p className="mt-4 text-xs leading-5 text-muted">A private bucket: Open makes a link that works for an hour, for you alone.</p>}
    </>
  );
}

/**
 * The portfolio's file details popup: a preview, what the file is, Copy link and Open. A
 * processed photo also lists its sizes and share image.
 */
export function FileDetailsModal({
  item,
  bucket,
  copied,
  opening,
  onClose,
  onCopy,
  onOpen,
}: {
  item: Item | null;
  bucket: StorageBucket;
  copied: boolean;
  /** Open is fetching a link (private buckets). */
  opening: boolean;
  onClose: () => void;
  onCopy: (item: Item) => void;
  onOpen: (item: Item) => void;
}) {
  const canCopy = item?.type === "picture" || bucket.public;
  return (
    <Modal
      open={item !== null}
      onClose={onClose}
      title={item?.type === "picture" ? "Photo details" : "File details"}
      size="md"
      footer={
        item ? (
          <>
            {canCopy ? (
              <DashboardButton onClick={() => onCopy(item)}>
                <Link2 size={14} aria-hidden /> {copied ? "Copied!" : "Copy link"}
              </DashboardButton>
            ) : null}
            <SpriteButton type="button" onClick={() => onOpen(item)} disabled={opening}>
              {opening ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <ArrowUpRight size={15} aria-hidden />}
              {opening ? "Opening…" : "Open"}
            </SpriteButton>
          </>
        ) : null
      }
    >
      {item?.type === "picture" ? <PictureDetails picture={item} /> : item ? <FileDetails file={item} bucket={bucket} /> : null}
    </Modal>
  );
}
