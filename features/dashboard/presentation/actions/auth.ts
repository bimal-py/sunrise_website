"use server";

import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServerSupabase } from "@/lib/supabase/server";
import { routes } from "@/lib/routes";
import { requireAdminAction } from "@/features/dashboard/data/auth";
import type { ActionState } from "../components/ui/action-state";

export type SignInState = { error?: string; email?: string };

/** Only dashboard paths: a crafted ?next= can't send the admin off-site after login. */
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/dashboard") && !next.startsWith("//") && !next.includes("\\") ? next : routes.dashboard();
}

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!isSupabaseConfigured) return { error: "Supabase isn't configured for this deployment.", email };
  if (!email || !password) return { error: "Enter your email and password.", email };

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message === "Email not confirmed" ? "Confirm your email first (check your inbox)." : "Wrong email or password.", email };

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) {
    await supabase.auth.signOut();
    return { error: "This account doesn't have access to the dashboard.", email };
  }
  redirect(safeNext(formData.get("next")));
}

export async function signOut() {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect(routes.dashboardLogin());
}

/**
 * Settings → Account: change the signed-in admin's password. The current password is checked
 * first (a dashboard left open can't be used to lock the owner out), and other devices signed
 * in to the dashboard are signed out afterwards. Back to the page with ?changed= when done.
 */
export async function changePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await requireAdminAction();
  const current = String(formData.get("current") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!current) return { status: "error", message: "Enter your current password." };
  if (password.length < 10) return { status: "error", message: "Use at least 10 characters for the new password." };
  if (password.length > 72) return { status: "error", message: "Use at most 72 characters for the new password." };
  if (password !== confirm) return { status: "error", message: "The two new passwords don't match." };
  if (password === current) return { status: "error", message: "The new password is the same as the current one." };
  if (!user.email) return { status: "error", message: "This account has no email address to check the password against." };

  const { error: checkError } = await supabase.auth.signInWithPassword({ email: user.email, password: current });
  if (checkError) {
    if (checkError.code === "invalid_credentials") return { status: "error", message: "Your current password isn't right." };
    if (checkError.status === 429) return { status: "error", message: "Too many tries. Wait a few minutes, then try again." };
    return { status: "error", message: `Couldn't check your current password: ${checkError.message}` };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { status: "error", message: `Couldn't change the password: ${error.message}` };
  // Anyone else signed in with the old password loses their session (best effort).
  await supabase.auth.signOut({ scope: "others" }).catch(() => undefined);
  redirect(`${routes.dashboardSection("settings/account")}?changed=${Date.now().toString(36)}`);
}
