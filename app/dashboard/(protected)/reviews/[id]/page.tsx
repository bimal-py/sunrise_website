import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { routes } from "@/lib/routes";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { ConfirmSubmit } from "@/features/dashboard/presentation/components/form-controls";
import { PageHeader, Panel, rowLinkClass } from "@/features/dashboard/presentation/components/ui";
import { deleteReview } from "@/features/reviews/presentation/actions/reviews";
import { ReviewForm } from "@/features/reviews/presentation/components/review-form";

export const metadata: Metadata = { title: "Edit review" };

type PageProps = { params: Promise<{ id: string }> };

export default async function EditReviewPage({ params }: PageProps) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const { data: review } = await supabase.from("reviews").select("*").eq("id", id).maybeSingle();
  if (!review) notFound();
  return (
    <>
      <PageHeader eyebrow="Reviews" title={review.name} actions={<a href={routes.dashboardSection("reviews")} className={rowLinkClass}>← All reviews</a>} />
      <Panel>
        <ReviewForm review={review} />
      </Panel>
      <Panel title="Delete this review" description="Unticking “Show on the site” hides it instead." className="mt-6">
        <form action={deleteReview}>
          <input type="hidden" name="id" value={review.id} />
          <ConfirmSubmit confirm={`Delete the review from ${review.name}?`}>Delete review</ConfirmSubmit>
        </form>
      </Panel>
    </>
  );
}
