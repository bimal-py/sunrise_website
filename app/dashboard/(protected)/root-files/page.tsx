import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { routes } from "@/lib/routes";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { PageHeader, Pager, rowLinkClass, StatusBadge } from "@/features/dashboard/presentation/components/ui";
import { rootFileTypeLabel } from "@/features/root-files/domain/root-file";
import { IndexNowPanel } from "@/features/root-files/presentation/components/indexnow-panel";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { SpriteButton } from "@/shared/components/ui/sprite-button";

export const metadata: Metadata = { title: "Root files" };

const PAGE_SIZE = 25;

type PageProps = { searchParams: Promise<{ page?: string }> };

export default async function RootFilesPage({ searchParams }: PageProps) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? "", 10) || 1);
  const { supabase } = await requireAdmin();

  const [files, settings] = await Promise.all([
    supabase
      .from("root_files")
      .select("id, file_name, content_type, published, note", { count: "exact" })
      .order("file_name")
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    supabase.from("site_settings").select("indexnow_key").eq("id", 1).maybeSingle(),
  ]);
  if (files.error) throw new Error(`Couldn't load root files: ${files.error.message}`);
  const total = files.count ?? files.data.length;
  const section = routes.dashboardSection("root-files");

  return (
    <>
      <PageHeader
        eyebrow="Root Files"
        title="Root files"
        description="Small files served at the top of the site, when a service asks for one: Google Search Console's HTML verification file, Bing's BingSiteAuth.xml, an ads.txt."
        actions={
          <SpriteButton href={routes.dashboardNew("root-files")}>
            <Plus className="h-4 w-4" aria-hidden /> New root file
          </SpriteButton>
        }
      />

      {files.data.length === 0 ? (
        <EmptyState title={page > 1 ? "Nothing on this page" : "No root files yet"}>
          Add one when a service asks you to put a file on the site, such as Google Search Console&apos;s HTML file (google….html), Bing&apos;s BingSiteAuth.xml or an ads.txt. Verifying with a code
          in Settings → Search and sharing works too.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line rounded-panel border border-line bg-surface">
          {files.data.map((file) => (
            <li key={file.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-5">
              <div className="min-w-0 flex-1">
                <Link href={routes.dashboardItem("root-files", file.id)} className="break-all font-mono text-[15px] font-medium text-strong hover:text-primary">
                  /{file.file_name}
                </Link>
                <p className="mt-0.5 text-sm text-muted">{[rootFileTypeLabel(file.content_type), file.note].filter(Boolean).join(" · ")}</p>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                {file.published ? <StatusBadge tone="green">Published</StatusBadge> : <StatusBadge>Hidden</StatusBadge>}
                <Link href={routes.dashboardItem("root-files", file.id)} className={rowLinkClass}>
                  Edit
                </Link>
                {file.published && (
                  <a href={`/${file.file_name}`} target="_blank" rel="noopener noreferrer" className={rowLinkClass}>
                    View <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pager page={page} total={total} pageSize={PAGE_SIZE} href={(to) => (to > 1 ? `${section}?page=${to}` : section)} noun="files" />

      <div className="mt-6">
        <IndexNowPanel indexNowKey={settings.data?.indexnow_key ?? ""} />
      </div>
    </>
  );
}
