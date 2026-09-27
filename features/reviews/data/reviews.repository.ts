import "server-only";
import type { ReviewRepository } from "@/features/reviews/domain/repositories";
import { reviews, sampleReviews } from "./reviews.seed";

export const reviewRepository: ReviewRepository = {
  async list() {
    if (reviews.length > 0) return reviews;
    // Samples never reach production: the live site simply has no reviews scene until real ones exist.
    return process.env.NODE_ENV === "development" ? sampleReviews : [];
  },
};
