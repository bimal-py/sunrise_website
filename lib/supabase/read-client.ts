import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "./env";
import type { Database } from "./types";

let client: SupabaseClient<Database> | null = null;

/**
 * Cookie-free client for the public site's cached reads. It never touches cookies() or
 * headers(), so pages that use it stay static (see lib/cache/tags.ts).
 */
export function readClient(): SupabaseClient<Database> {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).");
  client ??= createClient<Database>(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}
