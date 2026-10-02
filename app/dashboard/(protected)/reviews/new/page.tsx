import type { Metadata } from "next";
import { routes } from "@/lib/routes";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { nextSortOrder } from "@/features/dashboard/data/pickers";
import { PageHeader, Panel, rowLinkClass } from "@/features/dashboard/presentation/components/ui";
import { ReviewForm } from "@/features/reviews/presentation/components/review-form";

export const metadata: Metadata = { title: "Add review" };

export default async function NewReviewPage() {
  const { supabase } = await requireAdmin();
  const sortOrder = await nextSortOrder(supabase, "reviews");
  const blank = { id: "", name: "", occasion: "", place: "", review_month: null, rating: 5, body: "", source_label: null, source_url: "", published: true, sort_order: sortOrder };
  return (
    <>
      <PageHeader eyebrow="Reviews" title="Add a review" actions={<a href={routes.dashboardSection("reviews")} className={rowLinkClass}>← All reviews</a>} />
      <Panel>
        <ReviewForm review={blank} />
      </Panel>
    </>
  );
}
