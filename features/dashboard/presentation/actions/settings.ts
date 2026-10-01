"use server";

import { updateTag } from "next/cache";
import { TAG } from "@/lib/cache/tags";
import type { SiteSettingsRow } from "@/lib/supabase/types";
import { requireAdminAction } from "@/features/dashboard/data/auth";
import { image, list, num, str, url } from "@/features/dashboard/data/form";
import type { ActionState } from "../components/form-controls";

/** Search Console / Bing give a whole <meta> tag; keep only its content="…" value. */
function verificationCode(value: string): string {
  return (/content=["']([^"']+)["']/i.exec(value)?.[1] ?? value).trim().slice(0, 200);
}

/** Saves one section of Settings (only that section's columns), then refreshes every page. */
export async function saveSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdminAction();
  const section = str(formData, "section", 20);
  const problems: string[] = [];
  let patch: Partial<SiteSettingsRow> = {};

  if (section === "studio") {
    patch = {
      name: str(formData, "name", 120),
      alternate_name: str(formData, "alternate_name", 160),
      name_ne: str(formData, "name_ne", 160),
      tagline: str(formData, "tagline", 160),
      tagline_ne: str(formData, "tagline_ne", 160),
      description: str(formData, "description", 400),
      footer_blurb: str(formData, "footer_blurb", 400),
      studio_blurb: str(formData, "studio_blurb", 600),
    };
    if (!patch.name) problems.push("The studio needs a name.");
    if (!patch.tagline) problems.push("Add the headline (it's the home page's title).");
  } else if (section === "contact") {
    const whatsapp = str(formData, "whatsapp", 30).replace(/\D/g, "");
    const email = str(formData, "email", 200);
    const maps = url(formData, "maps_url");
    const latitude = num(formData, "latitude");
    const longitude = num(formData, "longitude");
    patch = {
      phone: str(formData, "phone", 40),
      whatsapp,
      email,
      street: str(formData, "street", 160),
      locality: str(formData, "locality", 120),
      district: str(formData, "district", 120),
      region: str(formData, "region", 120),
      country: str(formData, "country", 80),
      country_code: str(formData, "country_code", 2).toUpperCase(),
      postal_code: str(formData, "postal_code", 20),
      address_line: str(formData, "address_line", 200),
      address_line_ne: str(formData, "address_line_ne", 200),
      maps_url: maps.value,
      latitude,
      longitude,
      area_served: list(formData, "area_served", 30),
    };
    if (whatsapp && (whatsapp.length < 8 || whatsapp.length > 15)) problems.push("WhatsApp: use the full number with country code, e.g. 9779866060450.");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) problems.push("That email address doesn't look right.");
    if (patch.country_code && !/^[A-Z]{2}$/.test(patch.country_code)) problems.push("Country code: two letters, e.g. NP.");
    if (maps.error) problems.push(`Map link: ${maps.error}`);
    if (latitude !== null && (latitude < -90 || latitude > 90)) problems.push("Latitude must be between -90 and 90.");
    if (longitude !== null && (longitude < -180 || longitude > 180)) problems.push("Longitude must be between -180 and 180.");
    if ((latitude === null) !== (longitude === null)) problems.push("Give both latitude and longitude, or neither.");
  } else if (section === "social") {
    const links = (["facebook_url", "youtube_url", "instagram_url", "tiktok_url"] as const).map((key) => [key, url(formData, key)] as const);
    for (const [key, link] of links) if (link.error) problems.push(`${key.replace("_url", "")}: ${link.error}`);
    const channel = str(formData, "youtube_channel_id", 40);
    if (channel && !/^UC[A-Za-z0-9_-]{22}$/.test(channel)) problems.push("YouTube channel id starts with UC and has 24 characters.");
    patch = { ...Object.fromEntries(links.map(([key, link]) => [key, link.value])), youtube_channel_id: channel };
  } else if (section === "founder") {
    patch = {
      founder_name: str(formData, "founder_name", 120),
      founder_name_ne: str(formData, "founder_name_ne", 120),
      founder_role: str(formData, "founder_role", 120),
      founder_quote: str(formData, "founder_quote", 400),
      founder_bio: str(formData, "founder_bio", 600),
      founder_photo: image(formData, "founder_photo"),
    };
    if (patch.founder_name && !patch.founder_role) problems.push("Add the founder's role (e.g. Founder & lead photographer).");
  } else if (section === "seo") {
    const clarity = str(formData, "clarity_id", 40);
    patch = {
      default_title: str(formData, "default_title", 120),
      og_image: image(formData, "og_image"),
      google_site_verification: verificationCode(str(formData, "google_site_verification", 400)),
      bing_site_verification: verificationCode(str(formData, "bing_site_verification", 400)),
      clarity_id: clarity,
    };
    if (clarity && !/^[a-z0-9]{1,32}$/i.test(clarity)) problems.push("Clarity id: letters and digits only.");
  } else {
    return { status: "error", message: "Unknown settings section." };
  }

  if (problems.length > 0) return { status: "error", message: problems.join(" ") };

  const { error } = await supabase.from("site_settings").update(patch).eq("id", 1);
  if (error) return { status: "error", message: `Couldn't save: ${error.message}` };

  // Settings appear on every page (nav, footer, structured data): all of them refresh on their next visit.
  updateTag(TAG.settings);
  return { status: "success", message: "Saved. The site shows it on the next visit." };
}
