import "server-only";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { TAG } from "@/lib/cache/tags";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { readClient } from "@/lib/supabase/read-client";
import type { ServiceRow } from "@/lib/supabase/types";
import type { OfferingIcon } from "@/shared/domain/offering";
import type { Service } from "@/features/services/domain/entities";
import type { ServiceRepository } from "@/features/services/domain/repositories";
import { services as seedServices } from "./services.seed";

export function rowToService(row: ServiceRow, printSlugs: Map<string, string>): Service {
  return {
    slug: row.slug,
    name: row.name,
    nameNe: row.name_ne,
    shortName: row.short_name || row.name,
    icon: row.icon as OfferingIcon,
    iconSvg: row.icon_svg ?? null,
    summary: row.summary,
    intro: row.intro,
    sections: row.sections,
    faqs: row.faqs,
    inquiry: row.inquiry,
    serviceType: row.service_type || row.name,
    featured: row.featured,
    coverFilmId: row.cover_film_id,
    filmCategory: row.film_category,
    relatedPrints: row.related_print_ids.map((id) => printSlugs.get(id)).filter((slug): slug is string => Boolean(slug)),
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    ogImage: row.og_image,
    updatedAt: row.updated_at,
  };
}

// Published services in display order, one cache entry. Tagged "prints" too: related prints
// are stored by id and shown by slug, so renaming a print must refresh them.
const loadServices = unstable_cache(
  async (): Promise<Service[]> => {
    const db = readClient();
    const [services, prints] = await Promise.all([
      db.from("services").select("*").eq("published", true).order("sort_order").order("created_at"),
      db.from("prints").select("id, slug").eq("published", true),
    ]);
    if (services.error) throw new Error(`services: ${services.error.message}`);
    if (prints.error) throw new Error(`prints: ${prints.error.message}`);
    const printSlugs = new Map(prints.data.map((p) => [p.id, p.slug]));
    return services.data.map((row) => rowToService(row, printSlugs));
  },
  ["services"],
  { tags: [TAG.services, TAG.prints] },
);

const all = cache(async (): Promise<Service[]> => (isSupabaseConfigured ? loadServices() : seedServices));

export const serviceRepository: ServiceRepository = {
  async list({ featured } = {}) {
    const services = await all();
    return featured === undefined ? services : services.filter((s) => s.featured === featured);
  },

  async get(slug) {
    return (await all()).find((s) => s.slug === slug) ?? null;
  },

  async listByPrint(printSlug) {
    return (await all()).filter((s) => s.relatedPrints.includes(printSlug));
  },
};
