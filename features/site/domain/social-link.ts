/**
 * The studio's profiles elsewhere (dashboard → Settings → Social links): shown as icons in the
 * footer, the home page's hero and slate, listed on the contact page, and given to search
 * engines as the business's `sameAs`. The WhatsApp button is not one of these: it comes from
 * the WhatsApp number in Settings.
 */
export type SocialLink = {
  id: string;
  /** Picks the built-in icon (see SOCIAL_PLATFORMS). */
  platform: string;
  /** The link's name: read out by screen readers, shown on the contact page. */
  label: string;
  url: string;
  /** An icon chosen in the dashboard (cleaned SVG), drawn instead of the built-in one. */
  iconSvg: string | null;
};

/** The platforms the dashboard offers; the first seven have a built-in brand mark. */
export const SOCIAL_PLATFORMS = [
  { value: "facebook", label: "Facebook" },
  { value: "youtube", label: "YouTube" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "x", label: "X (Twitter)" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "website", label: "Website" },
  { value: "other", label: "Other" },
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number]["value"];

export function isSocialPlatform(value: string): value is SocialPlatform {
  return SOCIAL_PLATFORMS.some((platform) => platform.value === value);
}

/** "Instagram" for "instagram"; unknown values are shown as stored. */
export function platformLabel(platform: string): string {
  return SOCIAL_PLATFORMS.find((entry) => entry.value === platform)?.label ?? platform;
}

/** "facebook.com/Sunrisephotostudio675" from the full address: the readable part of a link. */
export function displayUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = `${parsed.pathname}${parsed.search}`.replace(/\/+$/, "");
    return `${parsed.hostname.replace(/^www\./, "")}${path}`;
  } catch {
    return url;
  }
}

/**
 * True when a WhatsApp-platform link only opens a chat with the studio's own number, which
 * the site already shows as its WhatsApp button (so it isn't drawn twice).
 */
export function isOwnWhatsappChat(link: Pick<SocialLink, "platform" | "url">, whatsappNumber: string): boolean {
  if (link.platform !== "whatsapp" || !whatsappNumber) return false;
  try {
    const url = new URL(link.url);
    const host = url.hostname.replace(/^www\./, "");
    const digits = host === "wa.me" ? url.pathname.replace(/\D/g, "") : url.searchParams.get("phone")?.replace(/\D/g, "") ?? "";
    return digits === whatsappNumber.replace(/\D/g, "");
  } catch {
    return false;
  }
}
