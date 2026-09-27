import type { Review } from "@/features/reviews/domain/entities";

/**
 * The studio's reviews, newest first. EMPTY until real ones are added: copy
 * them from the Facebook page's recommendations (or Google reviews), with the
 * client's name as they'd like it shown and a link to the original. The home
 * page's "Kind words" scene only appears on the live site once this has
 * entries. Example entry:
 *
 *   { name: "Kedar & Sushma", occasion: "Wedding", place: "Syangja", date: "2026-06", rating: 5,
 *     text: "…their words…", source: { label: "Facebook", url: "https://www.facebook.com/…" } },
 */
export const reviews: Review[] = [];

/** Shown in development only, labelled SAMPLE, so the design can be seen before real reviews exist. */
export const sampleReviews: Review[] = [
  { name: "Client name", occasion: "Wedding", place: "Panchamul", rating: 5, sample: true, text: "Sample review. A real client's words about their wedding day will appear here, copied from the studio's Facebook recommendations with their permission." },
  { name: "Client name", occasion: "Pasni", place: "Walling", rating: 5, sample: true, text: "Sample review. Keep each one as the client wrote it; long reviews are shortened on the card and shown in full on the source page." },
  { name: "Client name", occasion: "Studio portraits", rating: 5, sample: true, text: "Sample review. Add entries to features/reviews/data/reviews.seed.ts and this scene appears on the live site." },
  { name: "Client name", occasion: "Bratabandha", place: "Tirasi", rating: 5, sample: true, text: "Sample review. Link each one to where it was published, so anyone can check it's real." },
];
