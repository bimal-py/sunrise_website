import type { ReviewRow } from "@/lib/supabase/types";
import { DashboardForm } from "@/features/dashboard/presentation/components/ui/dashboard-form";
import { DashboardField, DashboardInput, DashboardSelect, DashboardTextarea } from "@/features/dashboard/presentation/components/ui/dashboard-ui";
import { saveReview } from "@/features/reviews/presentation/actions/reviews";

export type ReviewValues = Pick<ReviewRow, "name" | "occasion" | "place" | "review_month" | "rating" | "body" | "source_label" | "source_url" | "published" | "sort_order"> & {
  /** Empty for a new review. */
  id: string;
};

/**
 * The review editor, laid out like the portfolio's certification editor: who and what,
 * their words, where it was posted, then order and status. Saving goes back to the list.
 */
export function ReviewForm({ review }: { review: ReviewValues }) {
  const creating = !review.id;
  return (
    <DashboardForm action={saveReview} submitLabel={creating ? "Add review" : "Save review"} pendingLabel={creating ? "Adding…" : "Saving…"}>
      {review.id ? <input type="hidden" name="id" value={review.id} /> : null}

      <p className="rounded-card border border-primary/35 bg-primary-soft px-3 py-2 text-xs leading-6 text-muted">
        Real reviews only: copy the client&apos;s words exactly from Facebook or Google (or as they gave them to you, with permission), name them the way they agreed, and link to the
        original. Never write one for them.
      </p>

      <div className="grid gap-5 md:grid-cols-2">
        <DashboardField label="Client's name" required help="Their name exactly as they agreed to be named on the site." example="Sushma K. or Kedar & Sushma">
          <DashboardInput name="name" defaultValue={review.name} maxLength={120} placeholder="Name" />
        </DashboardField>
        <DashboardField label="Occasion" help="What you photographed or filmed for them." example="Wedding">
          <DashboardInput name="occasion" defaultValue={review.occasion} maxLength={80} placeholder="Occasion (optional)" />
        </DashboardField>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <DashboardField label="Place" help="Where the event was." example="Walling, Syangja">
          <DashboardInput name="place" defaultValue={review.place} maxLength={80} placeholder="Place (optional)" />
        </DashboardField>
        <DashboardField label="Month" help="When they wrote the review.">
          <DashboardInput name="review_month" type="month" defaultValue={review.review_month ?? ""} placeholder="YYYY-MM" />
        </DashboardField>
      </div>

      <DashboardField label="Review text" required help="Their words, word for word. Don't correct or shorten them.">
        <DashboardTextarea name="body" rows={6} maxLength={4000} defaultValue={review.body} placeholder="Their words" />
      </DashboardField>

      <div className="grid gap-5 md:grid-cols-2">
        <DashboardField label="Source" required help="Where the client posted it. “In person” is for words they gave you directly, with their permission.">
          <DashboardSelect name="source_label" defaultValue={review.source_label ?? ""}>
            <option value="" disabled>
              Choose where it was posted
            </option>
            <option value="Facebook">Facebook</option>
            <option value="Google">Google</option>
            <option value="YouTube">YouTube</option>
            <option value="In person">In person</option>
          </DashboardSelect>
        </DashboardField>
        <DashboardField label="Review link" help="The review on Facebook, Google or YouTube, so anyone can check it. Not needed for “In person”." example="https://www.facebook.com/…">
          <DashboardInput name="source_url" type="url" defaultValue={review.source_url} maxLength={500} placeholder="https://…" spellCheck={false} autoCapitalize="off" />
        </DashboardField>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <DashboardField label="Stars" help="The stars they gave, kept for your records. The site never shows them as a rating to search engines.">
          <DashboardSelect name="rating" defaultValue={String(review.rating)}>
            {[5, 4, 3, 2, 1].map((stars) => (
              <option key={stars} value={stars}>
                {stars} {stars === 1 ? "star" : "stars"}
              </option>
            ))}
          </DashboardSelect>
        </DashboardField>
        <DashboardField label="Sort order" help="Lower numbers come first in the “Kind words” carousel." example="10">
          <DashboardInput name="sort_order" type="number" inputMode="numeric" step={1} defaultValue={review.sort_order} placeholder="Sort order" />
        </DashboardField>
        <DashboardField label="Status" required help="Published shows it on the home page; Draft keeps it here only.">
          <DashboardSelect name="status" defaultValue={review.published ? "published" : "draft"}>
            <option value="published">Published</option>
            <option value="draft">Draft (not on the site)</option>
          </DashboardSelect>
        </DashboardField>
      </div>
    </DashboardForm>
  );
}
