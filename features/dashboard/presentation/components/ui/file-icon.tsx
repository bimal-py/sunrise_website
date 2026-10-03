import { File, FileArchive, FileAudio, FileSpreadsheet, FileText, FileVideo, ImageIcon } from "lucide-react";
import type { FileKind } from "@/features/file-manager/domain/entities";

const ICONS = {
  image: ImageIcon,
  video: FileVideo,
  audio: FileAudio,
  pdf: FileText,
  sheet: FileSpreadsheet,
  archive: FileArchive,
  other: File,
} as const;

/** A type-appropriate outline icon for a file (fileKind in the file manager's domain). */
export function FileIcon({ kind, size = 18, className }: { kind: FileKind; size?: number; className?: string }) {
  const Icon = ICONS[kind] ?? File;
  return <Icon size={size} className={className} aria-hidden />;
}
