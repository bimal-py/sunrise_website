import type { Metadata } from "next";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { DashboardPageHeader } from "@/features/dashboard/presentation/components/ui/dashboard-page-header";
import { DashboardNotice } from "@/features/dashboard/presentation/components/ui/dashboard-ui";
import { listBuckets, listEntries } from "@/features/file-manager/data/storage.repository";
import { cleanPath, isPhotoFolder, type StorageBucket, type StorageListing } from "@/features/file-manager/domain/entities";
import { FileManagerView } from "@/features/file-manager/presentation/components/file-manager-view";
import { firstParam, type SearchParams } from "@/lib/utils/search-params";

export const metadata: Metadata = { title: "File Manager" };
/** Moving, renaming or deleting a big folder takes one Storage call per file (the actions run within this page). */
export const maxDuration = 60;

type PageProps = { searchParams: Promise<SearchParams> };

function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export default async function FileManagerPage({ searchParams }: PageProps) {
  await requireAdmin();
  const params = await searchParams;

  let buckets: StorageBucket[] = [];
  let bucketsError: string | null = null;
  try {
    buckets = await listBuckets();
  } catch (error) {
    bucketsError = messageOf(error, "Couldn't list the buckets.");
  }

  // ?bucket=files&path=price-lists: an unknown bucket falls back to the first (Photos).
  const wanted = firstParam(params, "bucket");
  const active = buckets.find((bucket) => bucket.name === wanted) ?? buckets[0] ?? null;
  const prefix = active ? cleanPath(firstParam(params, "path") ?? "").slice(0, 1024) : "";
  // A photo folder lists its photos from the media library; ?raw=1 (or a folder in Photos that
  // isn't one of the site's photo folders) lists the files as Storage keeps them.
  const raw = active?.name === "media" && prefix !== "" && (firstParam(params, "raw") === "1" || !isPhotoFolder(prefix.split("/")[0]));

  let listing: StorageListing | null = null;
  let listingError: string | null = null;
  if (active) {
    try {
      listing = await listEntries(active.name, prefix, { raw });
    } catch (error) {
      listingError = messageOf(error, "Couldn't open this folder. Try again.");
    }
  }

  return (
    <div className="grid gap-8">
      <DashboardPageHeader
        eyebrow="File Manager"
        title="Files and photos"
        description="The photos uploaded through the dashboard, kept in every size the site uses, and any other files, such as PDFs and price lists. Upload, sort them into folders, rename, move or delete them, and copy a link to use one anywhere."
      />
      {bucketsError ? (
        <DashboardNotice tone="error">{bucketsError}</DashboardNotice>
      ) : (
        <FileManagerView buckets={buckets} activeBucket={active?.name ?? null} prefix={prefix} raw={raw} listing={listing} listingError={listingError} />
      )}
    </div>
  );
}
