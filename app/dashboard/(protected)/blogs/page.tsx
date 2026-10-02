import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { routes } from "@/lib/routes";
import { formatDate } from "@/lib/utils/date";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { ListChips, ListSearch } from "@/features/dashboard/presentation/components/list-chips";
import { PageHeader, Pager, rowLinkClass, StatusBadge } from "@/features/dashboard/presentation/components/ui";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { SpriteButton } from "@/shared/components/ui/sprite-button";

export const metadata: Metadata = { title: "Blogs" };

const PAGE_SIZE = 20;
const VIEWS = [
  { id: "all", label: "All" },
  { id: "published", label: "Published" },
  { id: "draft", label: "Drafts" },
] as const;
type View = (typeof VIEWS)[number]["id"];
type PageProps = { searchParams: Promise<{ view?: string; q?: string; page?: string }> };

export default async function DashboardBlogsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const view: View = VIEWS.some((v) => v.id === params.view) ? (params.view as View) : "all";
  const q = params.q?.trim() ?? "";
  const page = Math.max(1, Number.parseInt(params.page ?? "", 10) || 1);
  const { supabase } = await requireAdmin();

  let query = supabase
    .from("posts")
    .select("id, slug, title, status, published_at, updated_at, featured, cover, tags", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (view !== "all") query = query.eq("status", view);
  if (q) query = query.or(`title.ilike.%${q.replace(/[%,()]/g, " ")}%,summary.ilike.%${q.replace(/[%,()]/g, " ")}%`);
  const { data: posts, count, error } = await query;
  if (error) throw new Error(`Couldn't load posts: ${error.message}`);

  const href = (next: { view?: View; page?: number }) => {
    const search = new URLSearchParams();
    const v = next.view ?? view;
    if (v !== "all") search.set("view", v);
    if (q) search.set("q", q);
    if (next.page && next.page > 1) search.set("page", String(next.page));
    const s = search.toString();
    return `${routes.dashboardSection("blogs")}${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader
        eyebrow="Blogs"
        title="Blog posts"
        description="Guides for clients. Drafts stay private until you publish them."
        actions={
          <SpriteButton href={routes.dashboardNew("blogs")}>
            <Plus className="h-4 w-4" aria-hidden /> New post
          </SpriteButton>
        }
      />
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <ListChips label="Post filters" items={VIEWS.map((v) => ({ href: href({ view: v.id }), label: v.label, active: view === v.id }))} />
        <ListSearch action={routes.dashboardSection("blogs")} q={q} placeholder="Search posts…" hidden={view !== "all" ? { view } : {}} />
      </div>
      {posts.length === 0 ? (
        <EmptyState title="No posts here">{q ? "Nothing matches that search." : "Write the first guide."}</EmptyState>
      ) : (
        <ul className="divide-y divide-line rounded-panel border border-line bg-surface">
          {posts.map((post) => (
            <li key={post.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-5">
              <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-card bg-raised sm:w-32">
                {post.cover && <Image src={post.cover.src} alt="" fill sizes="128px" placeholder="blur" blurDataURL={post.cover.blurDataURL} className="object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <Link href={routes.dashboardItem("blogs", post.id)} className="font-medium text-strong hover:text-primary">
                  {post.title}
                </Link>
                <p className="mt-0.5 text-sm text-muted">
                  {post.published_at ? formatDate(post.published_at) : "Not published"}
                  {post.tags.length > 0 && ` · ${post.tags.join(", ")}`}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {post.status === "published" ? <StatusBadge tone="green">Published</StatusBadge> : <StatusBadge>Draft</StatusBadge>}
                  {post.featured && <StatusBadge tone="gold">Featured</StatusBadge>}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Link href={routes.dashboardItem("blogs", post.id)} className={rowLinkClass}>
                  Edit
                </Link>
                <Link href={`${routes.dashboardItem("blogs", post.id)}/preview`} className={rowLinkClass}>
                  Preview
                </Link>
                {post.status === "published" && (
                  <a href={routes.post(post.slug)} target="_blank" rel="noopener noreferrer" className={rowLinkClass}>
                    View <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pager page={page} total={count ?? posts.length} pageSize={PAGE_SIZE} href={(p) => href({ page: p })} noun="posts" />
    </>
  );
}
