"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabasePublishableKey, supabaseUrl } from "./env";
import type { Database } from "./types";

/** Browser client for the dashboard (direct uploads to Storage as the signed-in admin). */
export function browserSupabase() {
  return createBrowserClient<Database>(supabaseUrl, supabasePublishableKey);
}
