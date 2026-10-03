import "server-only";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { TAG } from "@/lib/cache/tags";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { readClient } from "@/lib/supabase/read-client";
import type { PrintRow } from "@/lib/supabase/types";
import type { OfferingIcon } from "@/shared/domain/offering";
import type { Print } from "@/features/prints/domain/entities";
import type { PrintRepository } from "@/features/prints/domain/repositories";
import { prints as seedPrints } from "./prints.seed";

export function rowToPrint(row: PrintRow): Print {
  return {
    slug: row.slug,
    name: row.name,
    nameNe: row.name_ne,
    icon: row.icon as OfferingIcon,
    iconSvg: row.icon_svg ?? null,
    summary: row.summary,
    intro: row.intro,
    sections: row.sections,
    faqs: row.faqs,
    inquiry: row.inquiry,
    serviceType: row.service_type || row.name,
    featured: row.featured,
    previewFilmIds: row.preview_film_ids,
    highlight: row.highlight,
    options: row.options,
    optionsHeading: row.options_heading,
    mockup: row.mockup,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    ogImage: row.og_image,
    updatedAt: row.updated_at,
  };
}

// Published prints in display order, one cache entry, rebuilt only when a print is saved.
const loadPrints = unstable_cache(
  async (): Promise<Print[]> => {
    const { data, error } = await readClient().from("prints").select("*").eq("published", true).order("sort_order").order("created_at");
    if (error) throw new Error(`prints: ${error.message}`);
    return data.map(rowToPrint);
  },
  ["prints"],
  { tags: [TAG.prints] },
);

const all = cache(async (): Promise<Print[]> => (isSupabaseConfigured ? loadPrints() : seedPrints));

export const printRepository: PrintRepository = {
  async list({ featured } = {}) {
    const prints = await all();
    return featured === undefined ? prints : prints.filter((p) => p.featured === featured);
  },

  async get(slug) {
    return (await all()).find((p) => p.slug === slug) ?? null;
  },

  async listBySlugs(slugs) {
    const prints = await all();
    return slugs.map((slug) => prints.find((p) => p.slug === slug)).filter((p) => p !== undefined);
  },
};
