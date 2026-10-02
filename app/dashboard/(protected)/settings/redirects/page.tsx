import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { routes } from "@/lib/routes";
import { formatDate } from "@/lib/utils/date";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { ConfirmSubmit } from "@/features/dashboard/presentation/components/form-controls";
import { SettingsTabs } from "@/features/dashboard/presentation/components/settings-tabs";
import { PageHeader, Pager, Panel, StatusBadge } from "@/features/dashboard/presentation/components/ui";
import { deleteRedirect } from "@/features/redirects/presentation/actions/redirects";
import { RedirectForm } from "@/features/redirects/presentation/components/redirect-form";

export const metadata: Metadata = { title: "Redirects" };

const PAGE_SIZE = 25;

type PageProps = { searchParams: Promise<{ page?: string }> };

export default async function RedirectsPage({ searchParams }: PageProps) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? "", 10) || 1);
  const { supabase } = await requireAdmin();

  const { data: redirects, count, error } = await supabase
    .from("redirects")
    .select("id, source, destination, permanent, note, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("source")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error) throw new Error(`Couldn't load redirects: ${error.message}`);
  const total = count ?? redirects.length;
  const section = `${routes.dashboardSection("settings")}/redirects`;

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Redirects"
        description="Send visitors and search engines from an old address to its new one, so old links and search results keep working."
      />
      <SettingsTabs />
      <div className="flex flex-col gap-6">
        <Panel
          title="Add a redirect"
          description="Old film, service, print and blog addresses redirect straight away (renaming a slug adds one automatically); other old addresses start redirecting after the next deploy."
        >
          <RedirectForm />
        </Panel>

        <Panel title="Saved redirects" description={total > 0 ? `${total} in all, newest first.` : undefined}>
          {redirects.length === 0 ? (
            <p className="text-sm text-muted">{page > 1 ? "Nothing on this page." : "None yet. Renaming a film, service, print or post adds one here by itself."}</p>
          ) : (
            <ul className="divide-y divide-line">
              {redirects.map((r) => (
                <li key={r.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-5">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-sm">
                      <span className="break-all text-strong">{r.source}</span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />
                      <span className="sr-only">redirects to</span>
                      <span className="break-all text-foreground">{r.destination}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted">{[`Added ${formatDate(r.created_at)}`, r.note].filter(Boolean).join(" · ")}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    {r.permanent ? <StatusBadge>Permanent</StatusBadge> : <StatusBadge tone="gold">Temporary</StatusBadge>}
                    <form action={deleteRedirect}>
                      <input type="hidden" name="id" value={r.id} />
                      <ConfirmSubmit confirm={`Delete the redirect from ${r.source}? Old links to it will stop working.`}>Delete</ConfirmSubmit>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Pager page={page} total={total} pageSize={PAGE_SIZE} href={(to) => (to > 1 ? `${section}?page=${to}` : section)} noun="redirects" />
        </Panel>
      </div>
    </>
  );
}
