"use server";

import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServerSupabase } from "@/lib/supabase/server";
import { routes } from "@/lib/routes";

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

/** Settings → Account: change the signed-in admin's password. */
export async function changePassword(_prev: { status: "idle" | "success" | "error"; message?: string }, formData: FormData) {
  const supabase = await createServerSupabase();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) return { status: "error" as const, message: "Sign in again first." };
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 10) return { status: "error" as const, message: "Use at least 10 characters." };
  if (password !== confirm) return { status: "error" as const, message: "The two passwords don't match." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { status: "error" as const, message: error.message };
  return { status: "success" as const, message: "Password changed. Use it next time you sign in." };
}
