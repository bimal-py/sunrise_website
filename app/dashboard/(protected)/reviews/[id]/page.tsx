import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { DashboardPageHeader } from "@/features/dashboard/presentation/components/ui/dashboard-page-header";
import { ReviewForm } from "@/features/reviews/presentation/components/review-form";

export const metadata: Metadata = { title: "Edit review" };

type PageProps = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditReviewPage({ params }: PageProps) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const { data: review, error } = await supabase
    .from("reviews")
    .select("id, name, occasion, place, review_month, rating, body, source_label, source_url, published, sort_order")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Couldn't load the review: ${error.message}`);
  if (!review) notFound();
  return (
    <div className="grid gap-8">
      <DashboardPageHeader eyebrow="Reviews" title={`Edit: ${review.name}`} description="Update the review's details, its place in the carousel and whether it's on the site." />
      <ReviewForm review={review} />
    </div>
  );
}
