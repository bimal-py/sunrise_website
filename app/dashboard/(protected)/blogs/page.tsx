import type { Metadata } from "next";
import { routes } from "@/lib/routes";
import { formatDate } from "@/lib/utils/date";
import { deletePost } from "@/features/blog/presentation/actions/posts";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { DashboardPageHeader } from "@/features/dashboard/presentation/components/ui/dashboard-page-header";
import { DashboardResourceActions } from "@/features/dashboard/presentation/components/ui/dashboard-resource-actions";
import { DashboardCard, DashboardEmptyState, DashboardNotice, StatusBadge } from "@/features/dashboard/presentation/components/ui/dashboard-ui";
import { DashboardFilterBar } from "@/features/dashboard/presentation/components/ui/filter-bar";
import { Pager } from "@/features/dashboard/presentation/components/ui/pager";
import { SpriteButton } from "@/shared/components/ui/sprite-button";

export const metadata: Metadata = { title: "Blogs" };

const PAGE_SIZE = 20;

type Search = Record<string, string | string[] | undefined>;
type PageProps = { searchParams: Promise<Search> };

/** The first value of a search param, trimmed ("" when missing). */
function param(search: Search, key: string): string {
  const value = search[key];
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export default async function DashboardBlogsPage({ searchParams }: PageProps) {
  const search = await searchParams;
  const status = ["published", "draft"].includes(param(search, "status")) ? param(search, "status") : "";
  const sort = param(search, "sort") === "published" ? "published" : "";
  const order = param(search, "order") === "asc" ? "asc" : "";
  const q = param(search, "q").slice(0, 100);
  const page = Math.max(1, Number.parseInt(param(search, "page"), 10) || 1);
  const saved = param(search, "saved");
  const savedState = param(search, "state");
  const deleted = param(search, "deleted");
  const { supabase } = await requireAdmin();

  let query = supabase.from("posts").select("id, slug, title, summary, status, published_at, updated_at, featured, reading_minutes", { count: "exact" });
  if (status) query = query.eq("status", status as "draft" | "published");
  // Characters PostgREST reads as syntax inside or() are dropped from the search words.
  const term = q.replace(/[%,()"\\*:]/g, " ").trim();
  if (term) query = query.or(`title.ilike.%${term}%,summary.ilike.%${term}%,slug.ilike.%${term}%`);
  const { data: posts, count, error } = await query
    .order(sort === "published" ? "published_at" : "updated_at", { ascending: order === "asc", nullsFirst: false })
    .order("id")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error) throw new Error(`Couldn't load the posts: ${error.message}`);

  const list = routes.dashboardSection("blogs");
  const filtered = Boolean(status || term);
  const pageHref = (to: number) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (sort) params.set("sort", sort);
    if (order) params.set("order", order);
    if (q) params.set("q", q);
    if (to > 1) params.set("page", String(to));
    const text = params.toString();
    return text ? `${list}?${text}` : list;
  };

  return (
    <div className="grid gap-8">
      <DashboardPageHeader
        eyebrow="Blogs"
        title="Manage writing without clutter."
        description="Guides for clients. Each post is one card here with its own Edit, Preview and Delete; drafts stay private until you publish them."
        primaryAction={{ href: routes.dashboardNew("blogs"), label: "Create new blog" }}
      />

      {saved ? (
        <DashboardNotice>
          Saved “{saved}”.{" "}
          {savedState === "draft"
            ? "It's a draft: not on the site until you publish it."
            : savedState === "moved"
              ? "It has a new address now; the old one redirects to it."
              : savedState === "live"
                ? "The site shows it on the next visit."
                : ""}
        </DashboardNotice>
      ) : null}
      {deleted ? <DashboardNotice>Deleted “{deleted}”.</DashboardNotice> : null}

      <DashboardFilterBar
        action={list}
        search={{ name: "q", placeholder: "Search titles and summaries…", defaultValue: q }}
        fields={[
          {
            name: "status",
            label: "Status",
            defaultValue: status,
            options: [
              { value: "", label: "All" },
              { value: "published", label: "Published" },
              { value: "draft", label: "Draft" },
            ],
          },
          {
            name: "sort",
            label: "Sort by",
            defaultValue: sort,
            options: [
              { value: "", label: "Updated date" },
              { value: "published", label: "Published date" },
            ],
          },
          {
            name: "order",
            label: "Order",
            defaultValue: order,
            options: [
              { value: "", label: "Newest first" },
              { value: "asc", label: "Oldest first" },
            ],
          },
        ]}
      />

      {posts.length === 0 ? (
        <DashboardEmptyState
          title={filtered ? "Nothing matches" : page > 1 ? "Nothing on this page" : "No posts yet"}
          action={filtered ? undefined : <SpriteButton href={routes.dashboardNew("blogs")}>Create new blog</SpriteButton>}
        >
          {filtered ? "Try other words, or set Status back to All." : "Write the first guide: what to plan for a wedding shoot, what to capture at a pasni, how to choose an album."}
        </DashboardEmptyState>
      ) : (
        <section className="grid gap-6" aria-label="Posts">
          {posts.map((post) => {
            const live = post.status === "published";
            return (
              <DashboardCard key={post.id} className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 max-w-3xl">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="break-words font-display text-[26px] font-semibold leading-tight text-strong">{post.title}</h2>
                      {post.featured ? <StatusBadge status="Featured" /> : null}
                      <StatusBadge status={live ? "Published" : "Draft"} />
                    </div>
                    <p className="mt-1 break-all font-mono text-xs text-muted">{routes.post(post.slug)}</p>
                    {post.summary ? <p className="mt-4 text-base leading-8 text-muted">{post.summary}</p> : null}
                    <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">
                      <span>{post.reading_minutes} min read</span>
                      <span aria-hidden>•</span>
                      <span>{post.published_at ? `${live ? "Published" : "Dated"} ${formatDate(post.published_at)}` : "Not published yet"}</span>
                      <span aria-hidden>•</span>
                      <span>Updated {formatDate(post.updated_at)}</span>
                    </div>
                  </div>
                  <DashboardResourceActions
                    editHref={routes.dashboardItem("blogs", post.id)}
                    previewHref={live ? routes.post(post.slug) : `${routes.dashboardItem("blogs", post.id)}/preview`}
                    deleteAction={deletePost}
                    deleteFields={{ id: post.id }}
                    deleteConfirm={{
                      title: `Delete “${post.title}”?`,
                      message: live ? "It comes off the site and its address sends visitors to the blog. This can't be undone." : "This can't be undone.",
                    }}
                  />
                </div>
              </DashboardCard>
            );
          })}
        </section>
      )}

      <Pager page={page} total={count ?? posts.length} pageSize={PAGE_SIZE} href={pageHref} noun="posts" />
    </div>
  );
}
