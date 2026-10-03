import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { routes } from "@/lib/routes";
import { getDashboardSession } from "@/features/dashboard/data/auth";
import { LoginForm } from "@/features/dashboard/presentation/components/login-form";
import { eyebrowClass } from "@/features/dashboard/presentation/components/ui/dashboard-ui";

export const metadata: Metadata = { title: "Sign in" };

type PageProps = { searchParams: Promise<{ next?: string; denied?: string }> };

export default async function LoginPage({ searchParams }: PageProps) {
  const { next, denied } = await searchParams;
  const session = await getDashboardSession();
  if (session?.isAdmin) redirect(next?.startsWith("/dashboard") ? next : routes.dashboard());

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 items-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full rounded-panel border border-line bg-surface p-7 sm:p-8">
        <p className={eyebrowClass}>Dashboard Login</p>
        <h1 className="mt-3 font-display text-3xl font-semibold leading-tight text-strong sm:text-4xl">Sign in to manage the site.</h1>
        <p className="mt-3 text-sm leading-7 text-muted">Private area — admin access only.</p>
        <div className="mt-6">
          {isSupabaseConfigured ? (
            <LoginForm next={next} denied={denied === "1" || Boolean(session && !session.isAdmin)} />
          ) : (
            <p className="rounded-card border border-line-strong bg-raised p-4 text-sm leading-6 text-muted">
              Supabase isn&apos;t configured for this deployment. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and
              SUPABASE_SERVICE_ROLE_KEY, then redeploy.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
