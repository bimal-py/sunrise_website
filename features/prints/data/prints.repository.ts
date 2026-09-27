import "server-only";
import type { PrintRepository } from "@/features/prints/domain/repositories";
import { prints } from "./prints.seed";

export const printRepository: PrintRepository = {
  async list({ featured } = {}) {
    return featured === undefined ? prints : prints.filter((p) => p.featured === featured);
  },

  async get(slug) {
    return prints.find((p) => p.slug === slug) ?? null;
  },

  async listBySlugs(slugs) {
    return slugs.map((slug) => prints.find((p) => p.slug === slug)).filter((p) => p !== undefined);
  },
};
