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

const month = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: siteTimeZone });

const isoDay = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: siteTimeZone });

/** "2026-09-23" → "Sept 2026" in Kathmandu time. */
export function formatMonth(value: string): string {
  return month.format(new Date(value));
}

/** Today in Kathmandu as YYYY-MM-DD (UTC still says yesterday until 05:45 there). */
export function kathmanduToday(now: Date = new Date()): string {
  return isoDay.format(now);
}

/** "2026-10-01T08:20:00Z" → "1 Oct 2026, 14:05" in Kathmandu time (dashboard). */
export function formatDateTime(value: string): string {
  return dateTime.format(new Date(value));
}

/** "2026-09-23" → "23 Sept 2026" in Kathmandu time. */
export function formatDate(value: string): string {
  return formatter.format(new Date(value));
}
