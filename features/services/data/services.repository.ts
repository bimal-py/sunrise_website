import "server-only";
import type { ServiceRepository } from "@/features/services/domain/repositories";
import { services } from "./services.seed";

export const serviceRepository: ServiceRepository = {
  async list({ featured } = {}) {
    return featured === undefined ? services : services.filter((s) => s.featured === featured);
  },

  async get(slug) {
    return services.find((s) => s.slug === slug) ?? null;
  },

  async listByPrint(printSlug) {
    return services.filter((s) => s.relatedPrints.includes(printSlug));
  },
};
