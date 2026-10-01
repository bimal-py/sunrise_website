import "server-only";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { TAG } from "@/lib/cache/tags";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { readClient } from "@/lib/supabase/read-client";
import type { ReviewRow } from "@/lib/supabase/types";
import type { Review } from "@/features/reviews/domain/entities";
import type { ReviewRepository } from "@/features/reviews/domain/repositories";
import { reviews as seedReviews, sampleReviews } from "./reviews.seed";

export function rowToReview(row: ReviewRow): Review {
  return {
    name: row.name,
    occasion: row.occasion,
    place: row.place || undefined,
    date: row.review_month ?? undefined,
    rating: row.rating,
    text: row.body,
    source: row.source_label ? { label: row.source_label, url: row.source_url || undefined } : undefined,
  };
}

// Published reviews in display order, rebuilt only when a review is saved.
const loadReviews = unstable_cache(
  async (): Promise<Review[]> => {
    const { data, error } = await readClient().from("reviews").select("*").eq("published", true).order("sort_order").order("created_at", { ascending: false });
    if (error) throw new Error(`reviews: ${error.message}`);
    return data.map(rowToReview);
  },
  ["reviews"],
  { tags: [TAG.reviews] },
);

const all = cache(async (): Promise<Review[]> => (isSupabaseConfigured ? loadReviews() : seedReviews));

export const reviewRepository: ReviewRepository = {
  async list() {
    const reviews = await all();
    if (reviews.length > 0) return reviews;
    // Samples never reach production: the live site simply has no reviews scene until real ones exist.
    return process.env.NODE_ENV === "development" ? sampleReviews : [];
  },
};
