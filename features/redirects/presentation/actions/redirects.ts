"use server";

import { refresh, updateTag } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { TAG } from "@/lib/cache/tags";
import { siteUrl } from "@/lib/config/site";
import type { Database } from "@/lib/supabase/types";
import { requireAdminAction } from "@/features/dashboard/data/auth";
import { bool, str } from "@/features/dashboard/data/form";
import type { ActionState } from "@/features/dashboard/presentation/components/form-controls";
import { createsLoop, DETAIL_PATH, isSitePath, parseDestination, parseSource, PROTECTED_PATH } from "@/features/redirects/domain/redirect-rules";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** "film" when `path` is a film, service, print or post that's live on the site now. */
async function livePage(db: SupabaseClient<Database>, path: string): Promise<string | null> {
  const match = DETAIL_PATH.exec(path);
  if (!match) return null;
  const [, section, slug] = match;
  const head = { count: "exact", head: true } as const;
  if (section === "films") return (await db.from("films").select("youtube_id", head).eq("slug", slug).eq("hidden", false)).count ? "film" : null;
  if (section === "services") return (await db.from("services").select("id", head).eq("slug", slug).eq("published", true)).count ? "service" : null;
  if (section === "prints") return (await db.from("prints").select("id", head).eq("slug", slug).eq("published", true)).count ? "print" : null;
  return (await db.from("posts").select("id", head).eq("slug", slug).eq("status", "published")).count ? "blog post" : null;
}

export async function addRedirect(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdminAction();
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

  const { data: saved, error: loadError } = await supabase.from("redirects").select("source, destination");
  if (loadError) return { status: "error", message: `Couldn't check the saved redirects: ${loadError.message}` };
  if (saved.some((r) => r.source === source.path)) return { status: "error", message: `${source.path} already redirects. Delete that redirect first to send it somewhere else.` };
  if (destination.path && createsLoop(saved, source.path, destination.path, siteUrl)) {
    return { status: "error", message: `${destination.path} already redirects onward, and following those redirects comes back round: visitors would go in circles. Check the list below.` };
  }

  const { error } = await supabase.from("redirects").insert({
    source: source.path,
    destination: destination.value,
    permanent: bool(formData, "permanent"),
    note: str(formData, "note", 300),
  });
  if (error) return { status: "error", message: error.code === "23505" ? `${source.path} already redirects.` : `Couldn't save: ${error.message}` };

  // Detail pages read the redirects through this tag (their cached "not found" included).
  updateTag(TAG.redirects);
  refresh();
  return {
    status: "success",
    message: DETAIL_PATH.test(source.path)
      ? `Saved. ${source.path} redirects to ${destination.value} now.`
      : `Saved. ${source.path} starts redirecting to ${destination.value} after the next deploy.`,
  };
}

export async function deleteRedirect(formData: FormData) {
  const { supabase } = await requireAdminAction();
  const id = str(formData, "id", 40);
  if (!UUID.test(id)) throw new Error("Bad request.");
  const { error } = await supabase.from("redirects").delete().eq("id", id);
  if (error) throw new Error(error.message);
  updateTag(TAG.redirects);
  refresh();
}
