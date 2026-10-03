import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { routes } from "@/lib/routes";
import { formatDateTime } from "@/lib/utils/date";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { DashboardCard, StatusBadge } from "@/features/dashboard/presentation/components/ui/dashboard-ui";
import { messageSubject } from "@/features/messages/presentation/message-subject";
import { SpriteButton } from "@/shared/components/ui/sprite-button";

export const metadata: Metadata = { title: "Overview" };

/** Supabase's free plan includes 1 GB of file storage; shown as a reference (raise it on a paid plan). */
const FREE_TIER_STORAGE_BYTES = 1024 * 1024 * 1024;

const panelLink = "font-mono text-[11px] uppercase tracking-[0.16em] text-primary underline-offset-4 transition-colors duration-150 hover:underline";

function formatStorage(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;

/** A number tile, as on the portfolio (mono label, big serif number), linked to its list. */
function Stat({ label, value, note, href }: { label: string; value: number; note?: string; href: string }) {
  return (
    <Link href={href} className="block min-w-0 rounded-card border border-line bg-surface p-4 transition-colors duration-150 hover:border-line-strong sm:p-5">
      <p className="truncate font-mono text-[11px] uppercase tracking-[0.16em] text-muted">{label}</p>
      {/* Lining figures: Cormorant's default old-style 0 and 1 read as "o" and "I". */}
      <p className="mt-3 font-display text-4xl font-semibold leading-none text-strong lining-nums tabular-nums">{value}</p>
      {note ? <p className="mt-2 truncate text-xs text-muted">{note}</p> : null}
    </Link>
  );
}

function Panel({ title, link, children }: { title: string; link?: { href: string; label: string }; children: ReactNode }) {
  return (
    <DashboardCard className="min-w-0 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold text-strong">{title}</h2>
        {link ? (
          <Link href={link.href} className={panelLink}>
            {link.label}
          </Link>
        ) : null}
      </div>
      {children}
    </DashboardCard>
  );
}

/** A row in a "Latest" list: the title, then a muted line. */
function Row({ title, detail, badge }: { title: string; detail: ReactNode; badge?: ReactNode }) {
  return (
    <li className="min-w-0 rounded-card border border-line bg-raised px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 truncate font-medium text-strong">{title}</p>
        {badge}
      </div>
      <p className="mt-1 truncate text-sm text-muted">{detail}</p>
    </li>
  );
}

export default async function DashboardOverviewPage() {
  const { supabase } = await requireAdmin();
  const head = { count: "exact", head: true } as const;
  const n = (result: { count: number | null }) => result.count ?? 0;

  const [films, hiddenFilms, uncurated, services, prints, products, posts, drafts, reviews, newEnquiries, orders, newOrders, usage, latestPosts, latestMessages] =
    await Promise.all([
      supabase.from("films").select("youtube_id", head).eq("hidden", false).then(n),
      supabase.from("films").select("youtube_id", head).eq("hidden", true).then(n),
      supabase.from("films").select("youtube_id", head).eq("curated", false).then(n),
      supabase.from("services").select("id", head).eq("published", true).then(n),
      supabase.from("prints").select("id", head).eq("published", true).then(n),
      supabase.from("products").select("id", head).eq("published", true).then(n),
      supabase.from("posts").select("id", head).eq("status", "published").then(n),
      supabase.from("posts").select("id", head).eq("status", "draft").then(n),
      supabase.from("reviews").select("id", head).eq("published", true).then(n),
      supabase.from("messages").select("id", head).eq("kind", "enquiry").eq("status", "new").then(n),
      supabase.from("messages").select("id", head).eq("kind", "order").then(n),
      supabase.from("messages").select("id", head).eq("kind", "order").eq("status", "new").then(n),
      supabase.rpc("storage_usage"),
      supabase.from("posts").select("id, title, slug, status, updated_at").order("updated_at", { ascending: false }).limit(4),
      supabase.from("messages").select("id, name, kind, occasion, product_name, status, created_at").order("created_at", { ascending: false }).limit(4),
    ]);

  const buckets = usage.data ?? [];
  const totalBytes = buckets.reduce((sum, bucket) => sum + Number(bucket.bytes ?? 0), 0);
  const fileCount = buckets.reduce((sum, bucket) => sum + Number(bucket.objects ?? 0), 0);
  const storagePct = Math.min(100, (totalBytes / FREE_TIER_STORAGE_BYTES) * 100);
  const section = routes.dashboardSection;

  return (
    <div className="grid gap-8">
      {/* The overview has no header card (as on the portfolio); its heading is for screen readers. */}
      <h1 className="sr-only">Overview</h1>

      <section aria-label="On the site" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Films" value={films} href={section("films")} note={[uncurated && `${uncurated} to curate`, hiddenFilms && `${hiddenFilms} hidden`].filter(Boolean).join(" · ") || "On the site"} />
        <Stat label="Services" value={services} href={section("services")} note="Published" />
        <Stat label="Prints" value={prints} href={section("prints")} note="Published" />
        <Stat label="Products" value={products} href={section("merchandise")} note="Published" />
        <Stat label="Blogs" value={posts} href={section("blogs")} note={drafts ? `Published · ${plural(drafts, "draft")}` : "Published"} />
        <Stat label="Reviews" value={reviews} href={section("reviews")} note="Published" />
        <Stat label="New messages" value={newEnquiries} href={`${routes.dashboardMessages("new")}&type=enquiry`} note={newEnquiries ? "Waiting for a reply" : "All caught up"} />
        <Stat label="Orders" value={orders} href={`${routes.dashboardMessages()}?type=order`} note={newOrders ? `${newOrders} new` : orders ? "None new" : "None yet"} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Panel title="Supabase storage" link={{ href: section("file-manager"), label: "Open files →" }}>
          {usage.error ? (
            <p className="mt-4 text-sm text-muted">Couldn&apos;t read how much storage is used ({usage.error.message}).</p>
          ) : (
            <>
              <p className="mt-4 font-display text-4xl font-semibold leading-none text-strong lining-nums">{formatStorage(totalBytes)}</p>
              <p className="mt-2 text-sm text-muted">
                {plural(fileCount, "file")} across {plural(buckets.length, "bucket")}
              </p>
              <div
                role="meter"
                aria-label="Storage used of the 1 GB free plan"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(storagePct)}
                className="mt-4 h-2 w-full overflow-hidden rounded-full bg-raised"
              >
                <div className="h-full rounded-full bg-primary" style={{ width: `${storagePct}%` }} />
              </div>
              <p className="mt-2 text-xs leading-5 text-muted">
                {storagePct.toFixed(1)}% of the 1&nbsp;GB free-plan limit · check{" "}
                <a href="https://supabase.com/dashboard/project/_/settings/billing/usage" target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-4 hover:underline">
                  Supabase usage
                </a>{" "}
                for your exact plan and database quota.
              </p>
            </>
          )}
        </Panel>

        <DashboardCard className="min-w-0 p-6">
          <h2 className="font-mono text-[11px] font-normal uppercase tracking-[0.18em] text-primary">Quick actions</h2>
          <div className="mt-5 flex flex-wrap gap-3">
            <SpriteButton href={routes.dashboardNew("blogs")}>New post</SpriteButton>
            <SpriteButton href={routes.dashboardNew("films")} variant="secondary">
              Add film
            </SpriteButton>
            <SpriteButton href={`${section("films")}#sync`} variant="secondary">
              Sync films
            </SpriteButton>
            <SpriteButton href={routes.dashboardNew("merchandise")} variant="secondary">
              New product
            </SpriteButton>
            <SpriteButton href={routes.dashboardNew("services")} variant="secondary">
              New service
            </SpriteButton>
          </div>
        </DashboardCard>

        <Panel title="Latest blogs" link={{ href: section("blogs"), label: "Open blogs →" }}>
          {latestPosts.data && latestPosts.data.length > 0 ? (
            <ul className="mt-5 space-y-3">
              {latestPosts.data.map((post) => (
                <Row key={post.id} title={post.title} detail={`${post.slug} · ${post.status}`} />
              ))}
            </ul>
          ) : (
            <p className="mt-5 text-sm text-muted">No posts yet.</p>
          )}
        </Panel>

        <Panel title="Latest messages" link={{ href: routes.dashboardMessages(), label: "Open inbox →" }}>
          {latestMessages.data && latestMessages.data.length > 0 ? (
            <ul className="mt-5 space-y-3">
              {latestMessages.data.map((message) => (
                <Row
                  key={message.id}
                  title={message.name}
                  detail={
                    <>
                      {messageSubject(message)} · <time dateTime={message.created_at}>{formatDateTime(message.created_at)}</time>
                    </>
                  }
                  badge={<StatusBadge status={message.status} />}
                />
              ))}
            </ul>
          ) : (
            <p className="mt-5 text-sm text-muted">No messages yet. Enquiries from the contact page and orders arrive here.</p>
          )}
        </Panel>
      </section>
    </div>
  );
}
