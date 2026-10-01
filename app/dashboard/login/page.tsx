import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { routes } from "@/lib/routes";
import { getDashboardSession } from "@/features/dashboard/data/auth";
import { LoginForm } from "@/features/dashboard/presentation/components/login-form";
import { SunriseMark } from "@/shared/components/brand/sunrise-mark";
import { eyebrowClasses } from "@/shared/components/ui/section-heading";

export const metadata: Metadata = { title: "Sign in" };

type PageProps = { searchParams: Promise<{ next?: string; denied?: string }> };

export default async function LoginPage({ searchParams }: PageProps) {
  const { next, denied } = await searchParams;
  const session = await getDashboardSession();
  if (session?.isAdmin) redirect(next?.startsWith("/dashboard") ? next : routes.dashboard());

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-panel border border-line bg-surface p-6 sm:p-8">
        <SunriseMark id="login" strokeWidth={7} className="w-10" />
        <p className={`mt-5 ${eyebrowClasses}`}>Dashboard</p>
        <h1 className="mt-1 text-[34px] leading-tight">Sign in</h1>
        <p className="mt-1 text-sm text-muted">For the studio only.</p>
        <div className="mt-6">
          {isSupabaseConfigured ? (
            <LoginForm next={next} denied={denied === "1" || Boolean(session && !session.isAdmin)} />
          ) : (
            <p className="rounded-card border border-line-strong p-4 text-sm text-muted">
              Supabase isn&apos;t configured for this deployment. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and
              SUPABASE_SERVICE_ROLE_KEY, then redeploy.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
