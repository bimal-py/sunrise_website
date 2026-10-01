import { revalidateTag } from "next/cache";
import { timingSafeEqual } from "node:crypto";
import { ALL_TAGS, type CacheTag } from "@/lib/cache/tags";

/**
 * Refresh the public pages after content is changed straight in Supabase (SQL editor, a
 * script) instead of through the dashboard, which refreshes them itself.
 *
 *   curl -X POST https://<site>/api/revalidate -H "Authorization: Bearer $REVALIDATE_SECRET" \
 *        -H "Content-Type: application/json" -d '{"tags":["films"]}'
 *
 * Tags are listed in lib/cache/tags.ts; ask only for what changed. Without REVALIDATE_SECRET
 * the endpoint is closed (503).
 */
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return Response.json({ error: "Revalidation is not configured." }, { status: 503 });

  const given = Buffer.from(request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "");
  const expected = Buffer.from(secret);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { tags?: unknown };
  const tags = Array.isArray(body.tags) ? body.tags.filter((tag): tag is CacheTag => ALL_TAGS.includes(tag as CacheTag)) : [];
  if (tags.length === 0) return Response.json({ error: `Send {"tags": [...]} with any of: ${ALL_TAGS.join(", ")}.` }, { status: 400 });

  // expire: 0 = the next visit gets fresh data (no stale copy served once more).
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
  return Response.json({ revalidated: tags });
}
