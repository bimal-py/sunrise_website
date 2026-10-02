import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { routes } from "@/lib/routes";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { PageHeader, rowLinkClass, StatusBadge } from "@/features/dashboard/presentation/components/ui";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { SpriteButton } from "@/shared/components/ui/sprite-button";

export const metadata: Metadata = { title: "Reviews" };

export default async function DashboardReviewsPage() {
  const { supabase } = await requireAdmin();
  const { data: reviews, error } = await supabase.from("reviews").select("id, name, occasion, body, source_label, published").order("sort_order").order("created_at", { ascending: false });
  if (error) throw new Error(`Couldn't load reviews: ${error.message}`);
  return (
    <>
      <PageHeader
        eyebrow="Reviews"
        title="Kind words"
        description="Clients' reviews for the home page. The “Kind words” scene appears on the site once there's at least one published review."
        actions={
          <SpriteButton href={routes.dashboardNew("reviews")}>
            <Plus className="h-4 w-4" aria-hidden /> Add review
          </SpriteButton>
        }
      />
      {reviews.length === 0 ? (
        <EmptyState title="No reviews yet">Copy one from the studio&apos;s Facebook recommendations or Google reviews, with the client&apos;s permission.</EmptyState>
      ) : (
        <ul className="divide-y divide-line rounded-panel border border-line bg-surface">
          {reviews.map((review) => (
            <li key={review.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:gap-5">
              <div className="min-w-0 flex-1">
                <Link href={routes.dashboardItem("reviews", review.id)} className="font-medium text-strong hover:text-primary">
                  {review.name}
                </Link>
                <p className="mt-0.5 line-clamp-2 text-sm text-muted">“{review.body}”</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {!review.published && <StatusBadge>Hidden</StatusBadge>}
                  {review.occasion && <StatusBadge>{review.occasion}</StatusBadge>}
                  {review.source_label && <StatusBadge tone="gold">{review.source_label}</StatusBadge>}
                </div>
              </div>
              <Link href={routes.dashboardItem("reviews", review.id)} className={rowLinkClass}>
                Edit
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
