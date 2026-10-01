/**
 * Supabase connection settings. The publishable key is safe in the browser; it only ever
 * reads what row level security lets anyone read. Without these the site falls back to the
 * static content in the seed files, and the dashboard explains what's missing.
 */
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

/** New "sb_publishable_" key; the legacy anon key name still works. */
export const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);
