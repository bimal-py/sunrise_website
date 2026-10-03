import type { Metadata } from "next";
import { routes } from "@/lib/routes";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { DashboardPageHeader } from "@/features/dashboard/presentation/components/ui/dashboard-page-header";
import { DashboardResourceActions } from "@/features/dashboard/presentation/components/ui/dashboard-resource-actions";
import { DashboardCard, DashboardEmptyState, DashboardNotice, StatusBadge } from "@/features/dashboard/presentation/components/ui/dashboard-ui";
import { DashboardFilterBar } from "@/features/dashboard/presentation/components/ui/filter-bar";
import { Pager } from "@/features/dashboard/presentation/components/ui/pager";
import { deleteReview } from "@/features/reviews/presentation/actions/reviews";
import { SpriteButton } from "@/shared/components/ui/sprite-button";

export const metadata: Metadata = { title: "Reviews" };

const PAGE_SIZE = 25;
const MONTH = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });

type Search = Record<string, string | string[] | undefined>;
type PageProps = { searchParams: Promise<Search> };

/** The first value of a search param, trimmed ("" when missing). */
function param(search: Search, key: string): string {
  const value = search[key];
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

/** A name at the end of a sentence: "Sushma K." doesn't get a second full stop. */
function endSentence(text: string): string {
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

/** "2026-09" → "Sept 2026". */
function monthLabel(value: string | null): string {
  return value && /^\d{4}-\d{2}$/.test(value) ? MONTH.format(new Date(`${value}-01T00:00:00Z`)) : "";
}

export default async function DashboardReviewsPage({ searchParams }: PageProps) {
  const search = await searchParams;
  const status = ["published", "draft"].includes(param(search, "status")) ? param(search, "status") : "";
  const sort = param(search, "sort") === "newest" ? "newest" : "";
  const page = Math.max(1, Number.parseInt(param(search, "page"), 10) || 1);
  const saved = param(search, "saved");
  const savedDraft = param(search, "state") === "draft";
  const deleted = param(search, "deleted");
  const { supabase } = await requireAdmin();

  let query = supabase.from("reviews").select("id, name, occasion, place, review_month, rating, body, source_label, source_url, published, sort_order", { count: "exact" });
  if (status) query = query.eq("published", status === "published");
  query = sort === "newest" ? query.order("created_at", { ascending: false }) : query.order("sort_order").order("created_at", { ascending: false });
  const { data: reviews, count, error } = await query.order("id").range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error) throw new Error(`Couldn't load the reviews: ${error.message}`);

  const list = routes.dashboardSection("reviews");
  const pageHref = (to: number) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (sort) params.set("sort", sort);
    if (to > 1) params.set("page", String(to));
    const text = params.toString();
    return text ? `${list}?${text}` : list;
  };

  return (
    <div className="grid gap-8">
      <DashboardPageHeader
        eyebrow="Reviews"
        title="Kind words, real ones only."
        description="Clients' reviews for the home page's “Kind words” scene, copied word for word from Facebook or Google (or given with permission). The scene appears once at least one review is published."
        primaryAction={{ href: routes.dashboardNew("reviews"), label: "Add review" }}
      />

      {saved ? (
        <DashboardNotice>
          Saved the review from {endSentence(saved)} {savedDraft ? "It's a draft: not on the home page." : "The home page shows it on the next visit."}
        </DashboardNotice>
      ) : null}
      {deleted ? <DashboardNotice>Deleted the review from {endSentence(deleted)}</DashboardNotice> : null}

      <DashboardFilterBar
        action={list}
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
              { value: "", label: "Order on the site" },
              { value: "newest", label: "Newest added" },
            ],
          },
        ]}
      />

      {reviews.length === 0 ? (
        <DashboardEmptyState
          title={status ? "Nothing matches" : page > 1 ? "Nothing on this page" : "No reviews yet"}
          action={status ? undefined : <SpriteButton href={routes.dashboardNew("reviews")}>Add review</SpriteButton>}
        >
          {status ? "Set Status back to All to see every review." : "Copy one from the studio's Facebook recommendations or Google reviews, with the client's permission."}
        </DashboardEmptyState>
      ) : (
        <section className="grid gap-6" aria-label="Reviews">
          {reviews.map((review) => {
            const details = [review.occasion, review.place, monthLabel(review.review_month)].filter(Boolean);
            return (
              <DashboardCard key={review.id} className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 max-w-3xl">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="break-words font-display text-[26px] font-semibold leading-tight text-strong">{review.name}</h2>
                      {review.source_label ? (
                        <span className="rounded-full border border-line-strong px-3 py-1 text-xs uppercase tracking-[0.18em] text-muted">{review.source_label}</span>
                      ) : null}
                      <StatusBadge status={review.published ? "Published" : "Draft"} />
                    </div>
                    {details.length > 0 ? <p className="mt-2 text-sm text-muted">{details.join(" • ")}</p> : null}
                    <p className="mt-4 line-clamp-4 whitespace-pre-line text-base leading-8 text-muted">“{review.body}”</p>
                    <p className="mt-4 text-xs uppercase tracking-[0.18em] text-muted">
                      Order {review.sort_order} · {review.rating} {review.rating === 1 ? "star" : "stars"}
                    </p>
                  </div>
                  <DashboardResourceActions
                    editHref={routes.dashboardItem("reviews", review.id)}
                    previewHref={review.source_url || undefined}
                    deleteAction={deleteReview}
                    deleteFields={{ id: review.id }}
                    deleteConfirm={{
                      title: `Delete the review from ${review.name}?`,
                      message: review.published ? "It comes off the home page. This can't be undone; choosing Draft hides it instead." : "This can't be undone.",
                    }}
                  />
                </div>
              </DashboardCard>
            );
          })}
        </section>
      )}

      <Pager page={page} total={count ?? reviews.length} pageSize={PAGE_SIZE} href={pageHref} noun="reviews" />
    </div>
  );
}
