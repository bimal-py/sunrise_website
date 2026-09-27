import { siteConfig } from "@/lib/config/site";

const formatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: siteConfig.timeZone,
});

/** "2026-09-23" → "23 Sept 2026" in Kathmandu time. */
export function formatDate(value: string): string {
  return formatter.format(new Date(value));
}
