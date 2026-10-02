import type { ReviewRow } from "@/lib/supabase/types";
import { saveReview } from "@/features/reviews/presentation/actions/reviews";
import { ActionForm } from "@/features/dashboard/presentation/components/action-form";
import { Checkbox, Field, inputClass, selectClass, textareaClass } from "@/features/dashboard/presentation/components/ui";

export type ReviewDraft = Omit<ReviewRow, "id" | "created_at" | "updated_at"> & { id: string };

export function ReviewForm({ review }: { review: ReviewDraft }) {
  return (
    <ActionForm action={saveReview} submitLabel={review.id ? "Save" : "Add review"}>
      <input type="hidden" name="id" value={review.id} />
      <p className="rounded-card border border-line-strong px-4 py-3 text-sm text-muted">
        Real reviews only: copy the client&apos;s words exactly from Facebook or Google (or as they gave them to you, with permission), name them the way they agreed, and link to the original. Never write one for them.
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Client's name (as they agreed)" htmlFor="name" hint="e.g. “Sushma K.” or “Kedar & Sushma”.">
          <input id="name" name="name" required maxLength={120} defaultValue={review.name} className={inputClass} />
        </Field>
        <Field label="What you shot" htmlFor="occasion" hint="e.g. Wedding, Pasni, Studio portraits.">
          <input id="occasion" name="occasion" maxLength={80} defaultValue={review.occasion} className={inputClass} />
        </Field>
        <Field label="Place" htmlFor="place">
          <input id="place" name="place" maxLength={80} defaultValue={review.place} className={inputClass} />
        </Field>
        <Field label="Month of the review" htmlFor="review_month">
          <input id="review_month" name="review_month" type="month" defaultValue={review.review_month ?? ""} className={inputClass} />
        </Field>
        <Field label="Their words" htmlFor="body" className="sm:col-span-2">
          <textarea id="body" name="body" required rows={5} maxLength={4000} defaultValue={review.body} className={textareaClass} />
        </Field>
        <Field label="Where it was posted" htmlFor="source_label">
          <select id="source_label" name="source_label" defaultValue={review.source_label ?? ""} className={selectClass}>
            <option value="">Not stated</option>
            <option>Facebook</option>
            <option>Google</option>
            <option>YouTube</option>
            <option>In person</option>
          </select>
        </Field>
        <Field label="Link to the review" htmlFor="source_url">
          <input id="source_url" name="source_url" type="url" defaultValue={review.source_url} className={inputClass} />
        </Field>
        <Field label="Stars they gave" htmlFor="rating" hint="Kept for your records; never shown as a rating to search engines.">
          <select id="rating" name="rating" defaultValue={String(review.rating)} className={selectClass}>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Order" htmlFor="sort_order" hint="Lower numbers come first.">
          <input id="sort_order" name="sort_order" type="number" defaultValue={review.sort_order} className={inputClass} />
        </Field>
        <Checkbox name="published" label="Show on the site" defaultChecked={review.published} />
      </div>
    </ActionForm>
  );
}
