import { ArrowUpRight, LogOut } from "lucide-react";
import { getSiteSettings } from "@/features/site/data/settings.repository";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { signOut } from "@/features/dashboard/presentation/actions/auth";
import { DashboardNav, type DashboardSection } from "@/features/dashboard/presentation/components/dashboard-nav";
import { Container } from "@/shared/components/ui/container";
import { eyebrowClasses } from "@/shared/components/ui/section-heading";

// Sections that exist so far (the rest are added as they're built).
const AVAILABLE: DashboardSection[] = ["overview", "messages", "settings"];

export default async function ProtectedDashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { supabase, user } = await requireAdmin();
  const [site, { count: unread }] = await Promise.all([
    getSiteSettings(),
    supabase.from("messages").select("id", { count: "exact", head: true }).eq("status", "new"),
  ]);

  return (
    <Container className="py-6 sm:py-8">
      <header className="rounded-panel border border-line bg-surface p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className={eyebrowClasses}>Dashboard</p>
            <p className="mt-1 font-display text-[30px] font-semibold leading-tight text-strong sm:text-[36px]">{site.name}</p>
            <p className="mt-1 text-sm text-muted">Signed in as {user.email}</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <a href="/" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1.5 text-primary hover:text-primary-strong">
              View site <ArrowUpRight className="h-4 w-4" aria-hidden />
            </a>
            <form action={signOut}>
              <button type="submit" className="inline-flex min-h-10 items-center gap-1.5 text-muted transition-colors duration-150 hover:text-strong">
                <LogOut className="h-4 w-4" aria-hidden /> Sign out
              </button>
            </form>
          </div>
        </div>
        <div className="mt-5 border-t border-line pt-4">
          <DashboardNav available={AVAILABLE} unread={unread ?? 0} />
        </div>
      </header>
      <div className="mt-6">{children}</div>
    </Container>
  );
}
