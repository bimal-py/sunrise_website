import "server-only";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { TAG } from "@/lib/cache/tags";
import { defaultSiteSettings, formatWhatsapp, siteAuthor, siteLocale, siteTimeZone, siteUrl, telHref } from "@/lib/config/site";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { readClient } from "@/lib/supabase/read-client";
import type { SiteSettingsRow } from "@/lib/supabase/types";
import type { Founder, SiteSettings } from "@/features/site/domain/entities";

export function toSiteSettings(row: SiteSettingsRow): SiteSettings {
  const founder: Founder | null = row.founder_name.trim()
    ? {
        name: row.founder_name,
        nameNe: row.founder_name_ne || undefined,
        role: row.founder_role,
        quote: row.founder_quote || undefined,
        bio: row.founder_bio || undefined,
        photo: row.founder_photo ?? undefined,
      }
    : null;

  return {
    name: row.name,
    alternateName: row.alternate_name,
    nameNe: row.name_ne,
    tagline: row.tagline,
    taglineNe: row.tagline_ne,
    description: row.description,
    footerBlurb: row.footer_blurb,
    studioBlurb: row.studio_blurb,
    defaultTitle: row.default_title || `${row.name}: wedding photos, films and prints in ${row.district || "Nepal"}`,
    url: siteUrl,
    locale: siteLocale,
    timeZone: siteTimeZone,
    author: siteAuthor,
    contact: {
      phone: row.phone,
      phoneHref: telHref(row.phone),
      whatsapp: row.whatsapp,
      whatsappDisplay: formatWhatsapp(row.whatsapp),
      email: row.email,
    },
    address: {
      street: row.street,
      locality: row.locality,
      district: row.district,
      region: row.region,
      country: row.country,
      countryCode: row.country_code,
      postalCode: row.postal_code,
      line: row.address_line,
      lineNe: row.address_line_ne,
      mapsUrl: row.maps_url,
      latitude: row.latitude,
      longitude: row.longitude,
    },
    areaServed: row.area_served,
    social: { facebook: row.facebook_url, youtube: row.youtube_url, instagram: row.instagram_url, tiktok: row.tiktok_url },
    youtubeChannelId: row.youtube_channel_id,
    founder,
    seo: {
      ogImage: row.og_image,
      googleVerification: row.google_site_verification,
      bingVerification: row.bing_site_verification,
      indexNowKey: row.indexnow_key,
    },
    clarityId: row.clarity_id,
  };
}

// One row, cached until a dashboard save calls updateTag(TAG.settings). No timer.
const loadSettings = unstable_cache(
  async (): Promise<SiteSettings> => {
    const { data, error } = await readClient().from("site_settings").select("*").eq("id", 1).maybeSingle();
    if (error) throw new Error(`site_settings: ${error.message}`);
    return data ? toSiteSettings(data) : defaultSiteSettings;
  },
  ["site-settings"],
  { tags: [TAG.settings] },
);

/** The studio's settings (per-request memo over the tagged cache). */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => (isSupabaseConfigured ? loadSettings() : defaultSiteSettings));
