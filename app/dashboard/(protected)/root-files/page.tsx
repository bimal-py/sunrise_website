import type { Metadata } from "next";
import { routes } from "@/lib/routes";
import { formatDate } from "@/lib/utils/date";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { DashboardButton } from "@/features/dashboard/presentation/components/ui/dashboard-button";
import { DashboardPageHeader } from "@/features/dashboard/presentation/components/ui/dashboard-page-header";
import { DashboardResourceActions } from "@/features/dashboard/presentation/components/ui/dashboard-resource-actions";
import { DashboardCard, DashboardEmptyState, DashboardNotice, StatusBadge } from "@/features/dashboard/presentation/components/ui/dashboard-ui";
import { Pager } from "@/features/dashboard/presentation/components/ui/pager";
import { rootFileTypeLabel } from "@/features/root-files/domain/root-file";
import { deleteRootFile } from "@/features/root-files/presentation/actions/root-files";
import { IndexNowPanel } from "@/features/root-files/presentation/components/indexnow-panel";
import { SpriteButton } from "@/shared/components/ui/sprite-button";

export const metadata: Metadata = { title: "Root files" };

const PAGE_SIZE = 25;

type Search = Record<string, string | string[] | undefined>;
type PageProps = { searchParams: Promise<Search> };

/** The first value of a search param, trimmed ("" when missing). */
function param(search: Search, key: string): string {
  const value = search[key];
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export default async function RootFilesPage({ searchParams }: PageProps) {
  const search = await searchParams;
  const page = Math.max(1, Number.parseInt(param(search, "page"), 10) || 1);
  const saved = param(search, "saved");
  const savedDraft = param(search, "state") === "draft";
  const deleted = param(search, "deleted");
  const { supabase } = await requireAdmin();

  const [files, settings] = await Promise.all([
    supabase
      .from("root_files")
      .select("id, file_name, content_type, storage_path, published, note, updated_at", { count: "exact" })
      .order("file_name")
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    supabase.from("site_settings").select("indexnow_key").eq("id", 1).maybeSingle(),
  ]);
  if (files.error) throw new Error(`Couldn't load the root files: ${files.error.message}`);
  const total = files.count ?? files.data.length;
  const list = routes.dashboardSection("root-files");

  return (
    <div className="grid gap-8">
      <DashboardPageHeader
        eyebrow="Root Files"
        title="Files at the top of the site."
        description="For files a service asks you to put on the domain itself, such as Google Search Console's google….html, Bing's BingSiteAuth.xml or an ads.txt. Each one is served at /<file name>, as text you type or a file you upload."
        primaryAction={{ href: routes.dashboardNew("root-files"), label: "Create root file" }}
      />

      {saved ? (
        <DashboardNotice>
          Saved {saved}.{" "}
          {savedDraft
            ? "It's a draft: the address answers “not found” until you publish it."
            : "It's served within a few minutes (browsers and the CDN keep a copy for up to five)."}
        </DashboardNotice>
      ) : null}
      {deleted ? <DashboardNotice>Deleted {deleted}. Its address now answers “not found”.</DashboardNotice> : null}

      {files.data.length === 0 ? (
        <DashboardEmptyState
          title={page > 1 ? "Nothing on this page" : "No root files yet"}
          action={page > 1 ? undefined : <SpriteButton href={routes.dashboardNew("root-files")}>Create root file</SpriteButton>}
        >
          Add one when a service asks you to put a file on the site. Verifying Google or Bing with a code in Settings (Search &amp; social) works too.
        </DashboardEmptyState>
      ) : (
        <section className="grid gap-6" aria-label="Root files">
          {files.data.map((file) => (
            <DashboardCard key={file.id} className="p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="break-all font-display text-[26px] font-semibold leading-tight text-strong">{file.file_name}</h2>
                    <StatusBadge status={file.published ? "Published" : "Draft"} />
                    <StatusBadge tone="neutral">{file.storage_path ? "Uploaded file" : "Text"}</StatusBadge>
                  </div>
                  <p className="mt-1 break-all font-mono text-xs text-muted">/{file.file_name}</p>
                  {file.storage_path ? <p className="mt-1 break-all font-mono text-xs text-muted">Serves files/{file.storage_path}</p> : null}
                  <p className="mt-4 text-base leading-8 text-muted">{file.note || "No description yet."}</p>
                  <p className="mt-4 text-xs uppercase tracking-[0.18em] text-muted">
                    {rootFileTypeLabel(file.content_type)} · Updated {formatDate(file.updated_at)}
                  </p>
                </div>
                <DashboardResourceActions
                  editHref={routes.dashboardItem("root-files", file.id)}
                  deleteAction={deleteRootFile}
                  deleteFields={{ id: file.id }}
                  deleteConfirm={{
                    title: `Delete /${file.file_name}?`,
                    message: `Its address stops working, and a service that checks it (Search Console, an ad network) may drop its verification.${file.storage_path ? " The uploaded file stays in the file manager." : ""} This can't be undone.`,
                  }}
                >
                  {file.published ? (
                    // Opened as the public sees it; no prefetch (it's a file, not a page).
                    <DashboardButton href={`/${file.file_name}`} newTab prefetch={false}>
                      Preview
                    </DashboardButton>
                  ) : null}
                </DashboardResourceActions>
              </div>
            </DashboardCard>
          ))}
        </section>
      )}

      <Pager page={page} total={total} pageSize={PAGE_SIZE} href={(to) => (to > 1 ? `${list}?page=${to}` : list)} noun="files" />

      <IndexNowPanel indexNowKey={settings.data?.indexnow_key ?? ""} />
    </div>
  );
}
