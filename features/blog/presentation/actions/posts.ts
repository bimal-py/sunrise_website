"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { TAG } from "@/lib/cache/tags";
import { siteTimeZone } from "@/lib/config/site";
import { checkSafeMdx } from "@/lib/mdx/compile";
import { routes } from "@/lib/routes";
import { notifyIndexNow } from "@/lib/seo/indexnow";
import { requireAdminAction } from "@/features/dashboard/data/auth";
import { bool, list, str, url } from "@/features/dashboard/data/form";
import { imageFromForm } from "@/features/dashboard/data/image-input";
import { recordMove, SLUG_PATTERN, uniqueSlug } from "@/features/dashboard/data/slugs";
import type { ActionState } from "@/features/dashboard/presentation/components/ui/action-state";
import { extractHeadings, readingTime, tagSlug } from "@/features/blog/data/blog.utils";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const LIST = routes.dashboardSection("blogs");
const MAX_MINUTES = 240;

/**
 * Back to the list, which says what happened ("Saved “…”."). `state` picks one of the list's
 * fixed follow-ups: a draft, live on the site, or live at a new address (the old one redirects).
 */
function backToList(outcome: "saved" | "deleted", label: string, state?: "draft" | "live" | "moved"): never {
  redirect(`${LIST}?${outcome}=${encodeURIComponent(label.slice(0, 80))}${state ? `&state=${state}` : ""}`);
}

/** A real calendar day in YYYY-MM-DD (the date picker's format). */
function isDate(value: string): boolean {
  if (!DATE.test(value)) return false;
  const day = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(day.getTime()) && day.toISOString().slice(0, 10) === value;
}

/** Today in Kathmandu, as YYYY-MM-DD (UTC would still say yesterday until 05:45 there). */
function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: siteTimeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** A link field: a full https link or a path on this site ("/films/…"); anything else is a problem. */
function link(formData: FormData, key: string, label: string, problems: string[]): string {
  const value = str(formData, key, 500);
  if (!value || (value.startsWith("/") && !value.startsWith("//"))) return value;
  const checked = url(formData, key);
  if (checked.error) problems.push(`${label}: ${checked.error}`);
  return value;
}

/** Catch MDX mistakes (an unclosed <Ne>, a stray "<") and unsafe tags before they reach a live page. */
function checkBody(body: string): Promise<string | null> {
  return checkSafeMdx(body, "The post text");
}

/**
 * Creates the post (the New page made its id, so a second press of Create saves the same
 * post instead of making two) or saves an existing one, then goes back to the list.
 */
export async function savePost(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdminAction();
  const id = str(formData, "id", 40);
  if (!UUID.test(id)) return { status: "error", message: "This form is out of date. Reload the page and try again." };

  const title = str(formData, "title", 200);
  const slugInput = str(formData, "slug", 120).toLowerCase();
  const summary = str(formData, "summary", 400);
  const body = String(formData.get("body") ?? "")
    .replace(/\r\n?/g, "\n")
    .slice(0, 200_000);
  const status = formData.get("status") === "published" ? "published" : "draft";
  let publishedAt = str(formData, "published_at", 10);
  const updatedOn = str(formData, "updated_on", 10);
  const minutesInput = str(formData, "reading_minutes", 6);
  // Topics: tidy capitalisation so "weddings" and "Weddings" are one topic; latin letters are needed for the topic's link.
  const tags = [...new Map(list(formData, "tags", 8).map((tag) => [tagSlug(tag), tag.charAt(0).toUpperCase() + tag.slice(1)])).entries()]
    .filter(([slug]) => slug)
    .map(([, tag]) => tag.slice(0, 40));

  const problems: string[] = [];
  if (!title) problems.push("The post needs a title.");
  if (slugInput && !SLUG_PATTERN.test(slugInput)) problems.push("Slug: lowercase letters, digits and single hyphens only (e.g. plan-your-wedding-photos).");
  if (status === "published") {
    if (!summary) problems.push("Add a summary before publishing (cards and search results use it).");
    if (!body.trim()) problems.push("The post has no text yet.");
    if (!publishedAt) publishedAt = today();
  }
  if (publishedAt && !isDate(publishedAt)) problems.push("Published date: use the date picker.");
  if (updatedOn && !isDate(updatedOn)) problems.push("Updated date: use the date picker.");
  let readingMinutes = readingTime(body);
  if (minutesInput) {
    const minutes = Number(minutesInput);
    if (Number.isInteger(minutes) && minutes >= 1 && minutes <= MAX_MINUTES) readingMinutes = minutes;
    else problems.push(`Reading time: a whole number of minutes (1 to ${MAX_MINUTES}), or leave it blank to work it out from the text.`);
  }
  const creditUrl = link(formData, "cover_credit_url", "Credit link", problems);
  const licenseUrl = link(formData, "cover_license_url", "Licence link", problems);
  // The photo is looked up in the library by its address: sizes and blur never come from the browser.
  const cover = await imageFromForm(supabase, formData, "cover");
  if (!cover && str(formData, "cover", 10)) problems.push("The cover photo isn't in the photo library any more. Choose it again.");
  const coverAlt = str(formData, "cover_alt", 300);
  if (cover && !coverAlt) problems.push("Describe the cover photo (alt text) for people who can't see it and for search engines.");
  if (problems.length > 0) return { status: "error", message: problems.join(" ") };

  const bodyProblem = body.trim() ? await checkBody(body) : null;
  if (bodyProblem) return { status: "error", message: bodyProblem };

  const row = {
    title,
    summary,
    body,
    status: status as "draft" | "published",
    published_at: publishedAt || null,
    updated_on: updatedOn || null,
    author: str(formData, "author", 120),
    tags,
    language: formData.get("language") === "ne" ? ("ne" as const) : ("en" as const),
    featured: bool(formData, "featured"),
    cover,
    cover_alt: coverAlt,
    cover_credit: str(formData, "cover_credit", 200),
    cover_credit_url: creditUrl,
    cover_license: str(formData, "cover_license", 120),
    cover_license_url: licenseUrl,
    reading_minutes: readingMinutes,
    headings: extractHeadings(body),
    seo_title: str(formData, "seo_title", 120),
    seo_description: str(formData, "seo_description", 300),
  };

  const { data: current, error: loadError } = await supabase.from("posts").select("slug, status").eq("id", id).maybeSingle();
  if (loadError) return { status: "error", message: `Couldn't check the post: ${loadError.message}` };

  if (!current) {
    const slug = await uniqueSlug(supabase, "posts", slugInput || title);
    const { error } = await supabase.from("posts").insert({ id, ...row, slug });
    if (error) return { status: "error", message: `Couldn't create the post: ${error.message}` };
    if (status === "published") {
      updateTag(TAG.posts);
      notifyIndexNow([routes.post(slug), routes.blog()]);
    }
    backToList("saved", title, status === "published" ? "live" : "draft");
  }

  // Blank keeps the address it has; a new one is made unique (the post's own counts as free).
  const slug = slugInput && slugInput !== current.slug ? await uniqueSlug(supabase, "posts", slugInput, current.slug) : current.slug;
  const { error } = await supabase.from("posts").update({ ...row, slug }).eq("id", id);
  if (error) return { status: "error", message: `Couldn't save the post: ${error.message}` };
  const wasLive = current.status === "published";
  if (slug !== current.slug && wasLive) {
    await recordMove(supabase, routes.post(current.slug), routes.post(slug), "Post renamed");
    updateTag(TAG.redirects);
  }
  // Drafts aren't on the site: only a published post (or one just taken down) changes public pages.
  if (status === "published" || wasLive) {
    updateTag(TAG.posts);
    notifyIndexNow([routes.post(slug), routes.post(current.slug), routes.blog()]);
  }
  backToList("saved", title, status !== "published" ? "draft" : slug !== current.slug && wasLive ? "moved" : "live");
}

/** Deletes a post. A published one's address then sends visitors to the blog. */
export async function deletePost(formData: FormData): Promise<void> {
  const { supabase } = await requireAdminAction();
  const id = str(formData, "id", 40);
  if (!UUID.test(id)) throw new Error("That post couldn't be found. Reload the page and try again.");
  const { data: post, error: loadError } = await supabase.from("posts").select("slug, status, title").eq("id", id).maybeSingle();
  if (loadError) throw new Error(`Couldn't find the post: ${loadError.message}`);
  if (!post) redirect(LIST);
  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) throw new Error(`Couldn't delete the post: ${error.message}`);
  if (post.status === "published") {
    await recordMove(supabase, routes.post(post.slug), routes.blog(), "Post removed");
    updateTag(TAG.posts);
    updateTag(TAG.redirects);
    notifyIndexNow([routes.post(post.slug), routes.blog()]);
  }
  backToList("deleted", post.title);
}
