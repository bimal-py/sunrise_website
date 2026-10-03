"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { TAG } from "@/lib/cache/tags";
import { siteUrl } from "@/lib/config/site";
import { routes } from "@/lib/routes";
import type { Database } from "@/lib/supabase/types";
import { requireAdminAction } from "@/features/dashboard/data/auth";
import { bool, str } from "@/features/dashboard/data/form";
import type { ActionState } from "@/features/dashboard/presentation/components/ui/action-state";
import { createsLoop, DETAIL_PATH, isSitePath, parseDestination, parseSource, PROTECTED_PATH } from "@/features/redirects/domain/redirect-rules";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LIST = `${routes.dashboardSection("settings")}/redirects`;

/** Back to the list, which says what happened. `note` picks one of the list's fixed explanations. */
function backToList(outcome: "saved" | "deleted", source: string, note?: "now" | "deploy"): never {
  redirect(`${LIST}?${outcome}=${encodeURIComponent(source.slice(0, 300))}${note ? `&when=${note}` : ""}`);
}

/** "film" when `path` is a film, service, print, product or post that's live on the site now. */
async function livePage(db: SupabaseClient<Database>, path: string): Promise<string | null> {
  const match = DETAIL_PATH.exec(path);
  if (!match) return null;
  const [, section, slug] = match;
  const head = { count: "exact", head: true } as const;
  if (section === "films") return (await db.from("films").select("youtube_id", head).eq("slug", slug).eq("hidden", false)).count ? "film" : null;
  if (section === "services") return (await db.from("services").select("id", head).eq("slug", slug).eq("published", true)).count ? "service" : null;
  if (section === "prints") return (await db.from("prints").select("id", head).eq("slug", slug).eq("published", true)).count ? "print" : null;
  if (section === "merchandise") return (await db.from("products").select("id", head).eq("slug", slug).eq("published", true)).count ? "product" : null;
  return (await db.from("posts").select("id", head).eq("slug", slug).eq("status", "published")).count ? "blog post" : null;
}

/**
 * Adds a redirect (no id) or changes one, then goes back to the list. Refused: the
 * dashboard and API, the site's own pages, a live film/service/print/product/post (renaming
 * it adds the redirect itself), an old address that already redirects, and anything that
 * would send visitors round in a circle through the saved redirects.
 */
export async function saveRedirect(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdminAction();
  const id = str(formData, "id", 40);
  if (id && !UUID.test(id)) return { status: "error", message: "That redirect no longer exists. Reload the page." };
  const source = parseSource(str(formData, "source", 1000));
  const destination = parseDestination(str(formData, "destination", 1000), siteUrl);

  if (!source.ok || !destination.ok) {
    return { status: "error", message: [!source.ok && source.error, !destination.ok && destination.error].filter(Boolean).join(" ") };
  }
  if (PROTECTED_PATH.test(source.path)) return { status: "error", message: "Addresses under /dashboard, /api and /_next can't be redirected." };
  if (isSitePath(source.path)) return { status: "error", message: `${source.path} is a page of this site; a redirect would hide it.` };
  if (destination.path?.toLowerCase() === source.path.toLowerCase()) return { status: "error", message: "The new address is the old one: that would send visitors round in a circle." };

  const live = await livePage(supabase, source.path);
  if (live) return { status: "error", message: `${source.path} is a live ${live}, so a redirect from it would never be used. Rename or remove the ${live} instead (that adds the redirect itself).` };

  const { data: all, error: loadError } = await supabase.from("redirects").select("id, source, destination");
  if (loadError) return { status: "error", message: `Couldn't check the saved redirects: ${loadError.message}` };
  if (id && !all.some((r) => r.id === id)) return { status: "error", message: "That redirect no longer exists. Reload the page." };
  // The redirect being changed doesn't count against itself.
  const others = all.filter((r) => r.id !== id);
  if (others.some((r) => r.source === source.path)) return { status: "error", message: `${source.path} already redirects. Change that redirect instead, or delete it first.` };
  if (destination.path && createsLoop(others, source.path, destination.path, siteUrl)) {
    return { status: "error", message: `${destination.path} already redirects onward, and following those redirects comes back round: visitors would go in circles. Check the list.` };
  }

  const row = { source: source.path, destination: destination.value, permanent: bool(formData, "permanent"), note: str(formData, "note", 300) };
  const { error } = id ? await supabase.from("redirects").update(row).eq("id", id) : await supabase.from("redirects").insert(row);
  if (error) return { status: "error", message: error.code === "23505" ? `${source.path} already redirects.` : `Couldn't save the redirect: ${error.message}` };

  // Detail pages read the redirects through this tag (their cached "not found" included).
  updateTag(TAG.redirects);
  backToList("saved", source.path, DETAIL_PATH.test(source.path) ? "now" : "deploy");
}

export async function deleteRedirect(formData: FormData): Promise<void> {
  const { supabase } = await requireAdminAction();
  const id = str(formData, "id", 40);
  if (!UUID.test(id)) throw new Error("That redirect couldn't be found. Reload the page and try again.");
  const { data, error } = await supabase.from("redirects").delete().eq("id", id).select("source");
  if (error) throw new Error(`Couldn't delete the redirect: ${error.message}`);
  if (data.length === 0) redirect(LIST);
  updateTag(TAG.redirects);
  backToList("deleted", data[0].source);
}
