"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { ALL_TAGS, TAG } from "@/lib/cache/tags";
import { resolveIconField } from "@/lib/icons/iconify";
import { routes } from "@/lib/routes";
import { notifyIndexNow } from "@/lib/seo/indexnow";
import type { Database, SiteSettingsRow } from "@/lib/supabase/types";
import type { ImageAsset } from "@/shared/domain/image";
import { requireAdminAction } from "@/features/dashboard/data/auth";
import { bool, list, num, str, url } from "@/features/dashboard/data/form";
import { imageFromForm } from "@/features/dashboard/data/image-input";
import { resolveChannelId } from "@/features/films/data/youtube";
import { SEO_TITLE_MAX } from "@/features/site/domain/page-content";
import { isSocialPlatform } from "@/features/site/domain/social-link";
import type { ActionState } from "../components/ui/action-state";

type Db = SupabaseClient<Database>;

const SETTINGS = routes.dashboardSection("settings");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function message(error: unknown, fallback: string): string {
  return (error instanceof Error && error.message ? error.message : fallback).slice(0, 240);
}

// ── Site settings ─────────────────────────────────────────────────────────────────────────────

/** Search Console / Bing give a whole <meta> tag; keep only its content="…" value. */
function verificationCode(value: string): string {
  return (/content=["']([^"']+)["']/i.exec(value)?.[1] ?? value).trim().slice(0, 200);
}

/**
 * The channel field: "@handle", a bare channel id (UC…) or any youtube.com link, as a full
 * https link. Empty stays empty (no channel: the films sync has nothing to read).
 */
function youtubeLink(input: string): { value: string; error?: string } {
  const text = input.trim();
  if (!text) return { value: "" };
  if (/^@[\w.-]{3,100}$/.test(text)) return { value: `https://www.youtube.com/${text}` };
  if (/^UC[\w-]{22}$/.test(text)) return { value: `https://www.youtube.com/channel/${text}` };
  let parsed: URL;
  try {
    parsed = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return { value: text, error: "Use the channel's link, e.g. https://www.youtube.com/@yourchannel" };
  }
  const host = parsed.hostname.toLowerCase();
  if (host !== "youtube.com" && !host.endsWith(".youtube.com") && host !== "youtu.be") {
    return { value: text, error: "That isn't a YouTube link. Use the channel's link, e.g. https://www.youtube.com/@yourchannel" };
  }
  parsed.protocol = "https:";
  return { value: parsed.toString().slice(0, 500) };
}

/** The channel's id (UC…) for a channel link: read from /channel/UC… links, else asked of YouTube (films sync's resolver). */
async function channelIdFor(link: string): Promise<string> {
  const direct = /\/channel\/(UC[\w-]{22})(?=[/?#]|$)/.exec(link)?.[1];
  if (direct) return direct;
  const answer: unknown = await resolveChannelId(link);
  const channelId = typeof answer === "string" ? answer : String((answer as { channelId?: unknown } | null)?.channelId ?? "");
  if (!/^UC[\w-]{22}$/.test(channelId)) throw new Error("YouTube didn't return a channel for that link.");
  return channelId;
}

/**
 * A photo field, read back from the media library (never trusting the browser's JSON). A
 * photo saved before the library existed may have no library row: it's kept while it is
 * still the one chosen.
 */
async function photoField(db: Db, formData: FormData, key: string, saved: ImageAsset | null): Promise<{ value: ImageAsset | null; error?: string }> {
  const text = String(formData.get(key) ?? "");
  if (!text) return { value: null };
  const picked = await imageFromForm(db, formData, key);
  if (picked) return { value: picked };
  try {
    if (saved && (JSON.parse(text) as { src?: unknown }).src === saved.src) return { value: saved };
  } catch {
    // Not JSON: treated as an unknown photo below.
  }
  return { value: null, error: "isn't in the photo library any more. Pick it again." };
}

/**
 * Settings → Site settings: the whole form in one save (studio, contact and address, founder,
 * YouTube, search and sharing). A channel link that changed is looked up on YouTube for its
 * id, which the films sync reads. Every page shows the change on its next visit.
 */
export async function saveSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdminAction();
  const { data: current, error: readError } = await supabase
    .from("site_settings")
    .select("youtube_url, youtube_channel_id, founder_photo, og_image")
    .eq("id", 1)
    .single();
  if (readError || !current) return { status: "error", message: `Couldn't read the current settings: ${readError?.message ?? "the settings row is missing"}.` };

  const problems: string[] = [];

  // Studio
  const name = str(formData, "name", 120);
  const tagline = str(formData, "tagline", 160);
  if (!name) problems.push("The studio needs a name.");
  if (!tagline) problems.push("Add the headline (it's the home page's title).");

  // Contact and address
  const whatsapp = str(formData, "whatsapp", 30).replace(/\D/g, "");
  const email = str(formData, "email", 200);
  const countryCode = str(formData, "country_code", 2).toUpperCase();
  const maps = url(formData, "maps_url");
  const latitude = num(formData, "latitude");
  const longitude = num(formData, "longitude");
  if (whatsapp && (whatsapp.length < 8 || whatsapp.length > 15)) problems.push("WhatsApp: use the full number with the country code, e.g. 9779866060450.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) problems.push("That email address doesn't look right.");
  if (countryCode && !/^[A-Z]{2}$/.test(countryCode)) problems.push("Country code: two letters, e.g. NP.");
  if (maps.error) problems.push(`Map link: ${maps.error}`);
  if (latitude !== null && (latitude < -90 || latitude > 90)) problems.push("Latitude must be between -90 and 90.");
  if (longitude !== null && (longitude < -180 || longitude > 180)) problems.push("Longitude must be between -180 and 180.");
  if ((latitude === null) !== (longitude === null)) problems.push("Give both latitude and longitude, or neither.");

  // Behind the lens (founder)
  const founderName = str(formData, "founder_name", 120);
  const founderRole = str(formData, "founder_role", 120);
  if (founderName && !founderRole) problems.push("Add the founder's role (e.g. Founder & lead photographer).");
  const founderPhoto = await photoField(supabase, formData, "founder_photo", current.founder_photo);
  if (founderPhoto.error) problems.push(`The portrait ${founderPhoto.error}`);

  // YouTube (the channel is looked up below, once everything else is in order)
  const youtube = youtubeLink(str(formData, "youtube_url", 500));
  if (youtube.error) problems.push(`YouTube: ${youtube.error}`);

  // Search and sharing
  const clarity = str(formData, "clarity_id", 40);
  if (clarity && !/^[a-z0-9]{1,32}$/i.test(clarity)) problems.push("Clarity id: letters and digits only.");
  const shareImage = await photoField(supabase, formData, "og_image", current.og_image);
  if (shareImage.error) problems.push(`The share image ${shareImage.error}`);

  if (problems.length > 0) return { status: "error", message: problems.join(" ") };

  // The films sync reads the channel's id: look it up only when the link changed (or none was found yet).
  let channelId = youtube.value ? current.youtube_channel_id : "";
  if (youtube.value && (youtube.value !== current.youtube_url || !current.youtube_channel_id)) {
    try {
      channelId = await channelIdFor(youtube.value);
    } catch (error) {
      return {
        status: "error",
        message: `YouTube: couldn't find the channel at that link (${message(error, "no answer from YouTube")}). Check the link, or try again in a minute. Nothing was saved.`,
      };
    }
  }

  const patch: Partial<SiteSettingsRow> = {
    name,
    name_ne: str(formData, "name_ne", 160),
    alternate_name: str(formData, "alternate_name", 160),
    tagline,
    tagline_ne: str(formData, "tagline_ne", 160),
    description: str(formData, "description", 400),
    footer_blurb: str(formData, "footer_blurb", 400),
    studio_blurb: str(formData, "studio_blurb", 600),
    phone: str(formData, "phone", 40),
    whatsapp,
    email,
    street: str(formData, "street", 160),
    locality: str(formData, "locality", 120),
    district: str(formData, "district", 120),
    region: str(formData, "region", 120),
    country: str(formData, "country", 80),
    country_code: countryCode,
    postal_code: str(formData, "postal_code", 20),
    address_line: str(formData, "address_line", 200),
    address_line_ne: str(formData, "address_line_ne", 200),
    maps_url: maps.value,
    latitude,
    longitude,
    area_served: list(formData, "area_served", 30),
    founder_name: founderName,
    founder_name_ne: str(formData, "founder_name_ne", 120),
    founder_role: founderRole,
    founder_quote: str(formData, "founder_quote", 400),
    founder_bio: str(formData, "founder_bio", 600),
    founder_photo: founderPhoto.value,
    youtube_url: youtube.value,
    youtube_channel_id: channelId,
    films_auto_publish: bool(formData, "films_auto_publish"),
    default_title: str(formData, "default_title", SEO_TITLE_MAX),
    og_image: shareImage.value,
    google_site_verification: verificationCode(str(formData, "google_site_verification", 400)),
    bing_site_verification: verificationCode(str(formData, "bing_site_verification", 400)),
    clarity_id: clarity,
  };

  const { error } = await supabase.from("site_settings").update(patch).eq("id", 1);
  if (error) return { status: "error", message: `Couldn't save: ${error.message}` };

  // Settings appear on every page (nav, footer, structured data): all of them refresh on their next visit.
  updateTag(TAG.settings);
  notifyIndexNow([routes.home(), routes.contact()]);
  return { status: "success", message: "Saved. The site shows the changes on the next visit." };
}

// ── Social links ──────────────────────────────────────────────────────────────────────────────

/** A profile's address: "instagram.com/x" gets its https://; only http(s) links are kept. */
function profileUrl(input: string): { value: string; error?: string } {
  const text = input.trim();
  if (!text) return { value: "", error: "Add the link's address." };
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(text) && !/^[^/:]+\.[a-z]{2,}:\d/i.test(text) ? text : `https://${text.replace(/^\/+/, "")}`;
  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return { value: text, error: "That doesn't look like a full link (https://…)." };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return { value: text, error: "Use a link that starts with https://" };
  if (!parsed.hostname.includes(".")) return { value: text, error: "That doesn't look like a full link (https://…)." };
  const value = parsed.toString();
  if (value.length > 500) return { value: text, error: "That link is too long (500 characters at most)." };
  return { value };
}

/** The profile columns in Settings that parts of the site built before social links still read. */
const PROFILE_COLUMNS = { facebook: "facebook_url", instagram: "instagram_url", tiktok: "tiktok_url" } as const;
type ProfilePlatform = keyof typeof PROFILE_COLUMNS;

/**
 * Parts of the site built before social links (the About page, "Review us on Facebook", and
 * the live site until this version ships) read one profile per platform from Settings: keep
 * those columns in step with the first visible link of each platform. A platform with no
 * links at all is left alone (its column may hold a link entered before social links
 * existed), unless its last link was just removed (`removed`). YouTube's column is the films
 * sync's channel (Settings → YouTube), so it's never touched. Best effort.
 */
async function syncProfileColumns(db: Db, removed?: string | null) {
  const platforms = Object.keys(PROFILE_COLUMNS) as ProfilePlatform[];
  const { data, error } = await db.from("social_links").select("platform, url, is_visible").in("platform", platforms).order("sort_order").order("created_at");
  if (error || !data) return console.error("[settings] couldn't read social links", error?.message);
  const patch: Partial<Record<(typeof PROFILE_COLUMNS)[ProfilePlatform], string>> = {};
  for (const platform of platforms) {
    const rows = data.filter((row) => row.platform === platform);
    if (rows.length === 0 && platform !== removed) continue;
    patch[PROFILE_COLUMNS[platform]] = rows.find((row) => row.is_visible)?.url ?? "";
  }
  if (Object.keys(patch).length === 0) return;
  const { error: updateError } = await db.from("site_settings").update(patch).eq("id", 1);
  if (updateError) console.error("[settings] couldn't update the profile columns", updateError.message);
}

/**
 * Settings → Social links → create or edit. A chosen icon is fetched and cleaned here (never
 * taken from the browser); a blank sort order puts a new link last. Back to Settings when saved.
 */
export async function saveSocialLink(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdminAction();
  const id = str(formData, "id", 40);
  if (id && !UUID.test(id)) return { status: "error", message: "That social link doesn't exist any more." };

  let current: { platform: string; icon_source: string; icon_svg: string | null; sort_order: number } | null = null;
  if (id) {
    const { data, error } = await supabase.from("social_links").select("platform, icon_source, icon_svg, sort_order").eq("id", id).maybeSingle();
    if (error) return { status: "error", message: `Couldn't read the link: ${error.message}` };
    if (!data) return { status: "error", message: "That social link doesn't exist any more (it may have been deleted)." };
    current = data;
  }

  const problems: string[] = [];
  const platform = str(formData, "platform", 40);
  const label = str(formData, "label", 80);
  const link = profileUrl(str(formData, "url", 600));
  const sortText = str(formData, "sort_order", 12);
  if (!isSocialPlatform(platform)) problems.push("Choose a platform.");
  if (!label) problems.push("Add a label (e.g. “Instagram”).");
  if (link.error) problems.push(link.error);
  if (sortText && !/^-?\d{1,9}$/.test(sortText)) problems.push("Sort order: a whole number, e.g. 10.");
  const icon = await resolveIconField(str(formData, "icon_source", 500), current ? { source: current.icon_source, svg: current.icon_svg } : null);
  if (!icon.ok) problems.push(`Custom icon: ${icon.error}`);
  if (problems.length > 0 || !icon.ok) return { status: "error", message: problems.join(" ") };

  let sortOrder = sortText ? Number.parseInt(sortText, 10) : (current?.sort_order ?? null);
  if (sortOrder === null) {
    const { data: last } = await supabase.from("social_links").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
    sortOrder = (last?.sort_order ?? 0) + 10;
  }

  const row = { platform, label, url: link.value, icon_source: icon.source, icon_svg: icon.svg, sort_order: sortOrder, is_visible: bool(formData, "is_visible") };
  const { error } = id ? await supabase.from("social_links").update(row).eq("id", id) : await supabase.from("social_links").insert(row);
  if (error) return { status: "error", message: `Couldn't save: ${error.message}` };

  await syncProfileColumns(supabase, current && current.platform !== platform ? current.platform : null);
  updateTag(TAG.settings);
  redirect(`${SETTINGS}?saved=${encodeURIComponent(label)}`);
}

/** Settings → Social links → Delete (asked first on the page). */
export async function deleteSocialLink(formData: FormData) {
  const { supabase } = await requireAdminAction();
  const id = str(formData, "id", 40);
  if (!UUID.test(id)) throw new Error("That social link doesn't exist any more.");
  const { data, error } = await supabase.from("social_links").delete().eq("id", id).select("label, platform").maybeSingle();
  if (error) throw new Error(`Couldn't delete the link: ${error.message}`);
  await syncProfileColumns(supabase, data?.platform);
  updateTag(TAG.settings);
  redirect(data?.label ? `${SETTINGS}?deleted=${encodeURIComponent(data.label)}` : SETTINGS);
}

/** Settings → Social links → ↑/↓: swaps a link with its neighbour and renumbers the list 10, 20, 30… */
export async function moveSocialLink(formData: FormData) {
  const { supabase } = await requireAdminAction();
  const id = str(formData, "id", 40);
  const direction = str(formData, "direction", 4);
  if (!UUID.test(id) || (direction !== "up" && direction !== "down")) throw new Error("That move isn't possible.");

  const { data, error } = await supabase.from("social_links").select("id, sort_order").order("sort_order").order("created_at");
  if (error) throw new Error(`Couldn't read the links: ${error.message}`);
  const ids = data.map((row) => row.id);
  const index = ids.indexOf(id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= ids.length) return;
  [ids[index], ids[target]] = [ids[target], ids[index]];

  const was = new Map(data.map((row) => [row.id, row.sort_order]));
  const changes = ids.map((rowId, position) => ({ rowId, sortOrder: (position + 1) * 10 })).filter(({ rowId, sortOrder }) => was.get(rowId) !== sortOrder);
  const results = await Promise.all(changes.map(({ rowId, sortOrder }) => supabase.from("social_links").update({ sort_order: sortOrder }).eq("id", rowId)));
  const failed = results.find((result) => result.error)?.error;
  if (failed) throw new Error(`Couldn't move the link: ${failed.message}`);

  await syncProfileColumns(supabase);
  updateTag(TAG.settings);
}

// ── Whole site ────────────────────────────────────────────────────────────────────────────────

/**
 * Rebuild every public page on its next visit: for content changed straight in Supabase
 * (SQL editor, scripts), which doesn't refresh the site by itself. Costs one rebuild per
 * page as it's visited, so it's a manual button, never automatic.
 */
export async function refreshWholeSite(): Promise<ActionState> {
  await requireAdminAction();
  for (const tag of ALL_TAGS) updateTag(tag);
  return { status: "success", message: "Done. Every page shows the latest content on its next visit." };
}
