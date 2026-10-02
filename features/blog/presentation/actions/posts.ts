"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { TAG } from "@/lib/cache/tags";
import { routes } from "@/lib/routes";
import { notifyIndexNow } from "@/lib/seo/indexnow";
import { requireAdminAction } from "@/features/dashboard/data/auth";
import { bool, image, list, str } from "@/features/dashboard/data/form";
import { recordMove, SLUG_PATTERN, uniqueSlug } from "@/features/dashboard/data/slugs";
import type { ActionState } from "@/features/dashboard/presentation/components/form-controls";
import { extractHeadings, readingTime, tagSlug } from "@/features/blog/data/blog.utils";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Catch MDX mistakes (an unclosed <Ne>, a stray "<") before they reach a live page. */
async function checkBody(body: string): Promise<string | null> {
  try {
    await compileMDX({ source: body, options: { mdxOptions: { remarkPlugins: [remarkGfm] } } });
    return null;
  } catch (error) {
    // next-mdx-remote puts a generic header on the first line; the useful part follows.
    const lines = (error instanceof Error ? error.message : "").split("\n").map((line) => line.replace(/^\[next-mdx-remote\] error compiling MDX:?/, "").trim()).filter(Boolean);
    const message = (lines[0] ?? "it couldn't be read").replace(/\.$/, "").slice(0, 200);
    return `The post text has a formatting problem: ${message}. (A “<” must start a tag like <Ne>…</Ne>; write “less than” otherwise.)`;
  }
}

export async function savePost(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdminAction();
  const id = str(formData, "id", 40);
  const title = str(formData, "title", 200);
  const slugInput = str(formData, "slug", 120).toLowerCase();
  const body = String(formData.get("body") ?? "").replace(/\r\n/g, "\n").slice(0, 200_000);
  const status = formData.get("status") === "published" ? "published" : "draft";
  let publishedAt = str(formData, "published_at", 10);
  const updatedOn = str(formData, "updated_on", 10);
  // Tags: tidy capitalisation so "weddings" and "Weddings" are one topic; latin letters needed for the topic link.
  const tags = [...new Map(list(formData, "tags", 8).map((t) => [tagSlug(t), t.charAt(0).toUpperCase() + t.slice(1)])).entries()]
    .filter(([slug]) => slug)
    .map(([, tag]) => tag.slice(0, 40));

  const problems: string[] = [];
  if (!title) problems.push("The post needs a title.");
  if (slugInput && !SLUG_PATTERN.test(slugInput)) problems.push("The address may only use lowercase letters, digits and single hyphens.");
  if (status === "published") {
    if (!str(formData, "summary", 400)) problems.push("Add a summary before publishing (cards and search results use it).");
    if (!body.trim()) problems.push("The post has no text yet.");
    if (!publishedAt) publishedAt = new Date().toISOString().slice(0, 10);
  }
  if (publishedAt && !DATE.test(publishedAt)) problems.push("Published date: use the date picker.");
  if (updatedOn && !DATE.test(updatedOn)) problems.push("Updated date: use the date picker.");
  if (problems.length) return { status: "error", message: problems.join(" ") };
  const bodyProblem = body.trim() ? await checkBody(body) : null;
  if (bodyProblem) return { status: "error", message: bodyProblem };

  const row = {
    title,
    summary: str(formData, "summary", 400),
    body,
    status: status as "draft" | "published",
    published_at: publishedAt || null,
    updated_on: updatedOn || null,
    author: str(formData, "author", 120),
    tags,
    language: formData.get("language") === "ne" ? ("ne" as const) : ("en" as const),
    featured: bool(formData, "featured"),
    cover: image(formData, "cover"),
    cover_alt: str(formData, "cover_alt", 300),
    cover_credit: str(formData, "cover_credit", 200),
    cover_credit_url: str(formData, "cover_credit_url", 500),
    cover_license: str(formData, "cover_license", 120),
    cover_license_url: str(formData, "cover_license_url", 500),
    reading_minutes: readingTime(body),
    headings: extractHeadings(body),
    seo_title: str(formData, "seo_title", 120),
    seo_description: str(formData, "seo_description", 300),
  };
  if (row.cover && !row.cover_alt) return { status: "error", message: "Describe the cover photo (alt text) for people who can't see it and for search engines." };

  if (!id) {
    const slug = await uniqueSlug(supabase, "posts", slugInput || title);
    const { data, error } = await supabase.from("posts").insert({ ...row, slug }).select("id").single();
    if (error) return { status: "error", message: `Couldn't create: ${error.message}` };
    if (status === "published") {
      updateTag(TAG.posts);
      notifyIndexNow([routes.post(slug), routes.blog()]);
    }
    redirect(routes.dashboardItem("blogs", data.id));
  }

  const { data: current } = await supabase.from("posts").select("slug, status").eq("id", id).single();
  if (!current) return { status: "error", message: "That post no longer exists." };
  const slug = slugInput && slugInput !== current.slug ? await uniqueSlug(supabase, "posts", slugInput, current.slug) : current.slug;
  const { error } = await supabase.from("posts").update({ ...row, slug }).eq("id", id);
  if (error) return { status: "error", message: `Couldn't save: ${error.message}` };
  if (slug !== current.slug && current.status === "published") {
    await recordMove(supabase, routes.post(current.slug), routes.post(slug), "Post renamed");
    updateTag(TAG.redirects);
  }
  // Drafts aren't on the site: only a published post (or one just unpublished) changes public pages.
  if (status === "published" || current.status === "published") updateTag(TAG.posts);
  if (status === "published") notifyIndexNow([routes.post(slug), routes.blog()]);
  return {
    status: "success",
    message: status === "published" ? (slug !== current.slug ? `Published. The old address redirects to /blogs/${slug}.` : "Saved and published. The site shows it on the next visit.") : "Draft saved (not on the site).",
  };
}

export async function deletePost(formData: FormData) {
  const { supabase } = await requireAdminAction();
  const id = str(formData, "id", 40);
  const { data: post } = await supabase.from("posts").select("slug, status").eq("id", id).single();
  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) throw new Error(error.message);
  if (post?.status === "published") {
    await recordMove(supabase, routes.post(post.slug), routes.blog(), "Post removed");
    updateTag(TAG.posts);
    updateTag(TAG.redirects);
  }
  redirect(routes.dashboardSection("blogs"));
}
