import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServerSupabase } from "@/lib/supabase/server";
import { routes } from "@/lib/routes";

/**
 * The signed-in user and whether they're on the admin list (public.admins). Sign-ups are
 * open on Supabase by default, so being signed in alone grants nothing. Memoised per request.
 */
export const getDashboardSession = cache(async () => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: isAdmin, error } = await supabase.rpc("is_admin");
  if (error) console.error("[dashboard] admin check failed", error.message);
  return { supabase, user, isAdmin: isAdmin === true };
});

/** For dashboard pages: the admin's session, or a redirect to the login page. */
export async function requireAdmin() {
  const session = await getDashboardSession();
  if (!session) redirect(routes.dashboardLogin());
  if (!session.isAdmin) redirect(`${routes.dashboardLogin()}?denied=1`);
  return session;
}

/** For server actions (public endpoints): throws unless the caller is an admin. */
export async function requireAdminAction() {
  const session = await getDashboardSession();
  if (!session?.isAdmin) throw new Error("You need to be signed in as the studio's admin to do that.");
  return session;
}
