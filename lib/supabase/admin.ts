import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabaseUrl } from "./env";
import type { Database } from "./types";

let client: SupabaseClient<Database> | null = null;

/**
 * Secret-key client: bypasses row level security. Server only, and only for work done on
 * behalf of visitors after validation (storing an enquiry). Null when the key isn't set.
 */
export function adminClient(): SupabaseClient<Database> | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!isSupabaseConfigured || !key) return null;
  client ??= createClient<Database>(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}
