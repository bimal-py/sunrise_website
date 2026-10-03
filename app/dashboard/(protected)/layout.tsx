import { ArrowUpRight } from "lucide-react";
import { routes } from "@/lib/routes";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { signOut } from "@/features/dashboard/presentation/actions/auth";
import { DashboardNav } from "@/features/dashboard/presentation/components/dashboard-nav";
import { DashboardSubmitButton } from "@/features/dashboard/presentation/components/ui/dashboard-submit-button";
import { eyebrowClass } from "@/features/dashboard/presentation/components/ui/dashboard-ui";

/**
 * The dashboard's frame, as on the portfolio: one card at the top (who's signed in, Sign
 * out, the section tabs), then the page, 32px below. Each page brings its own header card
 * with the page's <h1>, so the frame's title is not a heading.
 */
export default async function ProtectedDashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { supabase, user } = await requireAdmin();
  const { count: unread } = await supabase.from("messages").select("id", { count: "exact", head: true }).eq("status", "new");

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <header className="rounded-panel border border-line bg-surface px-6 py-6 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className={eyebrowClass}>Dashboard</p>
            <p className="mt-3 font-display text-3xl font-semibold leading-tight text-strong sm:text-4xl">Content control</p>
            <p className="mt-2 break-words text-sm text-muted">Signed in as {user.email ?? "the studio's admin"} (admin)</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <a
              href={routes.home()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-6 items-center gap-1 text-sm text-primary transition-colors duration-150 hover:text-primary-strong"
            >
              View site <ArrowUpRight size={15} aria-hidden />
            </a>
            <form action={signOut}>
              <DashboardSubmitButton variant="secondary" pendingLabel="Signing out…">
                Sign out
              </DashboardSubmitButton>
            </form>
          </div>
        </div>
        <div className="mt-6 border-t border-line pt-4">
          <DashboardNav unread={unread ?? 0} />
        </div>
      </header>
      <div className="min-w-0">{children}</div>
    </main>
  );
}
