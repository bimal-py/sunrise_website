import "server-only";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { TAG } from "@/lib/cache/tags";
import { defaultSiteSettings } from "@/lib/config/site";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { readClient } from "@/lib/supabase/read-client";
import type { SocialLinkRow } from "@/lib/supabase/types";
import type { SocialLink } from "@/features/site/domain/social-link";

export function toSocialLink(row: Pick<SocialLinkRow, "id" | "platform" | "label" | "url" | "icon_svg">): SocialLink {
  return { id: row.id, platform: row.platform, label: row.label, url: row.url, iconSvg: row.icon_svg };
}

/** Without Supabase: the two profiles the site has always shown (the migration seeds the same). */
const fallbackLinks: SocialLink[] = [
  { id: "facebook", platform: "facebook", label: "Facebook", url: defaultSiteSettings.social.facebook, iconSvg: null },
  { id: "youtube", platform: "youtube", label: "YouTube", url: defaultSiteSettings.social.youtube, iconSvg: null },
].filter((link) => link.url);

// The visible links in their order, cached with the settings: every social-link save calls
// updateTag(TAG.settings). No timer.
const loadSocialLinks = unstable_cache(
  async (): Promise<SocialLink[]> => {
    const { data, error } = await readClient()
      .from("social_links")
      .select("id, platform, label, url, icon_svg")
      .eq("is_visible", true)
      .order("sort_order")
      .order("created_at");
    if (error) throw new Error(`social_links: ${error.message}`);
    return data.map(toSocialLink);
  },
  ["social-links"],
  { tags: [TAG.settings] },
);

/** The studio's visible social links, in order (per-request memo over the tagged cache). */
export const getSocialLinks = cache(async (): Promise<SocialLink[]> => (isSupabaseConfigured ? loadSocialLinks() : fallbackLinks));
