import type { Metadata } from "next";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { DashboardPageHeader } from "@/features/dashboard/presentation/components/ui/dashboard-page-header";
import { ReviewForm } from "@/features/reviews/presentation/components/review-form";

export const metadata: Metadata = { title: "Add a review" };

export default async function NewReviewPage() {
  const { supabase } = await requireAdmin();
  // New reviews go to the end of the carousel.
  const { data: last } = await supabase.from("reviews").select("sort_order").order("sort_order", { ascending: false }).limit(1);
  const sortOrder = (last?.[0]?.sort_order ?? 0) + 10;
  return (
    <div className="grid gap-8">
      <DashboardPageHeader
        eyebrow="Reviews"
        title="Add a review"
        description="Copy a client's review word for word from where they posted it, then publish it to the home page's “Kind words” scene."
      />
      <ReviewForm
        review={{ id: "", name: "", occasion: "", place: "", review_month: null, rating: 5, body: "", source_label: null, source_url: "", published: true, sort_order: sortOrder }}
      />
    </div>
  );
}
