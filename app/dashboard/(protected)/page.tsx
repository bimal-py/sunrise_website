import type { Metadata } from "next";
import Link from "next/link";
import { CircleCheck, CircleDashed } from "lucide-react";
import { routes } from "@/lib/routes";
import { formatDateTime } from "@/lib/utils/date";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { PageHeader, Panel, rowLinkClass, Stat } from "@/features/dashboard/presentation/components/ui";

export const metadata: Metadata = { title: "Overview" };

export default async function DashboardOverviewPage() {
  const { supabase } = await requireAdmin();
  const head = { count: "exact", head: true } as const;
  const n = (result: { count: number | null }) => result.count ?? 0;

  const [newMessages, films, hiddenFilms, uncurated, services, prints, published, drafts, reviews, recent, settings] = await Promise.all([
    supabase.from("messages").select("id", head).eq("status", "new").then(n),
    supabase.from("films").select("youtube_id", head).eq("hidden", false).then(n),
    supabase.from("films").select("youtube_id", head).eq("hidden", true).then(n),
    supabase.from("films").select("youtube_id", head).eq("curated", false).then(n),
    supabase.from("services").select("id", head).eq("published", true).then(n),
    supabase.from("prints").select("id", head).eq("published", true).then(n),
    supabase.from("posts").select("id", head).eq("status", "published").then(n),
    supabase.from("posts").select("id", head).eq("status", "draft").then(n),
    supabase.from("reviews").select("id", head).eq("published", true).then(n),
    supabase.from("messages").select("id, name, occasion, created_at, status").order("created_at", { ascending: false }).limit(4),
    supabase.from("site_settings").select("founder_name, google_site_verification, bing_site_verification, og_image, latitude").eq("id", 1).single(),
  ]);

  const s = settings.data;
  const checks = [
    { done: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY), label: "Contact form saves enquiries", hint: "Needs SUPABASE_SERVICE_ROLE_KEY on the server." },
    { done: Boolean(s?.google_site_verification), label: "Google Search Console connected", hint: "Settings → Search and sharing (or upload Google's file in Root Files)." },
    { done: Boolean(s?.bing_site_verification), label: "Bing Webmaster Tools connected", hint: "Settings → Search and sharing." },
    { done: Boolean(s?.founder_name), label: "Founder shown on the home page", hint: "Settings → Founder." },
    { done: Boolean(s?.og_image), label: "Default share image", hint: "Settings → Search and sharing." },
    { done: s?.latitude !== null && s?.latitude !== undefined, label: "Map location for local search", hint: "Settings → Contact and address: latitude and longitude." },
    { done: reviews > 0, label: "Real client reviews", hint: "Copied word for word from Facebook or Google, with a link." },
  ];

  return (
    <>
      <PageHeader eyebrow="Overview" title="Today at the studio" description="What's on the site, what needs a reply, and what would help people find you." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="New messages" value={newMessages} note={newMessages ? "Waiting for a reply" : "All caught up"} href={routes.dashboardMessages("new")} />
        <Stat label="Films" value={films} note={[uncurated && `${uncurated} to curate`, hiddenFilms && `${hiddenFilms} hidden`].filter(Boolean).join(" · ") || "On the site"} />
        <Stat label="Services · Prints" value={`${services} · ${prints}`} note="Published" />
        <Stat label="Blog posts" value={published} note={drafts ? `${drafts} draft${drafts === 1 ? "" : "s"}` : "Published"} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Panel title="Latest enquiries" actions={<Link href={routes.dashboardMessages()} className={rowLinkClass}>All messages</Link>}>
          {recent.data && recent.data.length > 0 ? (
            <ul className="divide-y divide-line">
              {recent.data.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-strong">{m.name}</p>
                    <p className="truncate text-sm text-muted">{m.occasion || "Enquiry"}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    {m.status === "new" && <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">New</p>}
                    <p className="font-mono text-xs text-muted">{formatDateTime(m.created_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No enquiries yet. They arrive here from the contact page.</p>
          )}
        </Panel>

        <Panel title="Setup and search" description="Each of these helps people find and trust the studio.">
          <ul className="flex flex-col gap-3">
            {checks.map((check) => (
              <li key={check.label} className="flex items-start gap-3">
                {check.done ? <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden /> : <CircleDashed className="mt-0.5 h-5 w-5 shrink-0 text-muted" aria-hidden />}
                <div>
                  <p className={`text-sm font-medium ${check.done ? "text-foreground" : "text-strong"}`}>
                    {check.label}
                    <span className="sr-only">{check.done ? " (done)" : " (to do)"}</span>
                  </p>
                  {!check.done && <p className="text-xs text-muted">{check.hint}</p>}
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-5 border-t border-line pt-4 text-xs text-muted">
            Edit studio details in <Link href={routes.dashboardSection("settings")} className="text-primary hover:underline">Settings</Link>.
          </p>
        </Panel>
      </div>
    </>
  );
}
