import "server-only";
import { unstable_cache } from "next/cache";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { TAG } from "@/lib/cache/tags";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { readClient } from "@/lib/supabase/read-client";

type Redirect = { source: string; destination: string; permanent: boolean };

// Every redirect in one entry, rebuilt only when one is saved (renaming a slug adds one).
const loadRedirects = unstable_cache(
  async (): Promise<Redirect[]> => {
    const { data, error } = await readClient().from("redirects").select("source, destination, permanent");
    if (error) throw new Error(`redirects: ${error.message}`);
    return data;
  },
  ["redirects"],
  { tags: [TAG.redirects] },
);

export async function findRedirect(path: string): Promise<Redirect | null> {
  if (!isSupabaseConfigured) return null;
  return (await loadRedirects()).find((r) => r.source === path) ?? null;
}

/**
 * A detail page whose slug isn't found: follow a redirect saved for that path (an old
 * slug), else 404. Runs before anything streams, so both are real HTTP responses.
 */
export async function redirectOrNotFound(path: string): Promise<never> {
  const target = await findRedirect(path);
  if (target) {
    if (target.permanent) permanentRedirect(target.destination);
    redirect(target.destination);
  }
  notFound();
}
