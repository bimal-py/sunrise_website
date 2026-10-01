import { siteTimeZone } from "@/lib/config/site";

const formatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: siteTimeZone,
});

const dateTime = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: siteTimeZone,
});

/** "2026-10-01T08:20:00Z" → "1 Oct 2026, 14:05" in Kathmandu time (dashboard). */
export function formatDateTime(value: string): string {
  return dateTime.format(new Date(value));
}

/** "2026-09-23" → "23 Sept 2026" in Kathmandu time. */
export function formatDate(value: string): string {
  return formatter.format(new Date(value));
}
