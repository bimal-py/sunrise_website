import { ArrowUpRight, Star } from "lucide-react";
import type { Review } from "@/features/reviews/domain/entities";

function initials(name: string): string {
  return name
    .split(/[\s&]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");
}

const month = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" });

/**
 * A review as a card with a notch cut into its top-right corner (after
 * rudrakx.com's testimonials), and in the notch, instead of a cartoon avatar,
 * a monogram set inside a gold ring like a lens. No invented faces: just the
 * client's initials. Meta line in mono (occasion · place), the words, the
 * rating, and where it was published.
 */
export function ReviewCard({ review }: { review: Review }) {
  return (
    <figure className="review-card relative flex h-full w-[82vw] shrink-0 snap-start flex-col sm:w-[400px]">
      {/* Lens monogram, sitting in the notch. */}
      <span aria-hidden className="absolute right-0 top-0 flex size-[68px] items-center justify-center rounded-full border border-primary">
        <span className="flex size-[56px] items-center justify-center rounded-full border border-line-strong bg-surface font-display text-xl font-semibold text-strong">
          {initials(review.name)}
        </span>
      </span>

      <div className="review-card-body flex flex-1 flex-col rounded-panel bg-surface p-7">
        <figcaption className="pr-16">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
            {review.occasion}
            {review.place && <> · {review.place}</>}
          </p>
          <p className="mt-2 text-lg font-semibold text-strong">{review.name}</p>
        </figcaption>

        <blockquote className="mt-5 flex-1 text-[15px] leading-relaxed text-foreground">
          <p className="line-clamp-5">&ldquo;{review.text}&rdquo;</p>
        </blockquote>

        <div className="mt-6 flex items-center justify-between gap-3">
          <p className="flex gap-1 text-primary" aria-label={`${review.rating} out of 5`}>
            {Array.from({ length: 5 }, (_, i) => (
              <Star key={i} className={`h-4 w-4 ${i < review.rating ? "fill-current" : "opacity-30"}`} aria-hidden />
            ))}
          </p>
          {review.sample ? (
            <span className="rounded-full border border-primary/50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-primary">Sample</span>
          ) : review.source?.url ? (
            <a
              href={review.source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 py-1 text-xs text-muted transition-colors duration-150 hover:text-primary"
            >
              on {review.source.label} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </a>
          ) : review.date ? (
            <span className="text-xs text-muted">{month.format(new Date(`${review.date}-01`))}</span>
          ) : null}
        </div>
      </div>
    </figure>
  );
}
