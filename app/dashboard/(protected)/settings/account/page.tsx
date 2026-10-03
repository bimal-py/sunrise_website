import type { Metadata } from "next";
import { formatDateTime } from "@/lib/utils/date";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { changePassword } from "@/features/dashboard/presentation/actions/auth";
import { DashboardForm } from "@/features/dashboard/presentation/components/ui/dashboard-form";
import { DashboardPageHeader } from "@/features/dashboard/presentation/components/ui/dashboard-page-header";
import { DashboardCard, DashboardField, DashboardInput, DashboardNotice, StatusBadge } from "@/features/dashboard/presentation/components/ui/dashboard-ui";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ changed?: string | string[] }> }) {
  const { changed: changedParam } = await searchParams;
  const changed = (Array.isArray(changedParam) ? changedParam[0] : changedParam) ?? "";
  const { supabase, user } = await requireAdmin();
  const { data: admins, error } = await supabase.from("admins").select("email, created_at").order("created_at");
  if (error) throw new Error(`Couldn't load who can sign in: ${error.message}`);

  return (
    <div className="grid gap-8">
      <DashboardPageHeader eyebrow="Settings" title="Your account" description={`Signed in as ${user.email ?? "the studio's admin"}.`} />

      {changed ? <DashboardNotice>Password changed. Use it the next time you sign in.</DashboardNotice> : null}

      {/* A new key after each change: the form starts empty again instead of keeping the passwords typed. */}
      <DashboardForm key={changed || "form"} action={changePassword} submitLabel="Change password" pendingLabel="Changing…">
        <div>
          <h2 className="font-display text-2xl font-semibold text-strong">Change password</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            At least 10 characters. Other devices signed in to your account are signed out when it changes; other dashboard users keep their own passwords.
          </p>
        </div>
        <input type="email" name="username" autoComplete="username" defaultValue={user.email ?? ""} hidden readOnly />
        <div className="grid gap-5 md:grid-cols-2">
          <DashboardField label="Current password" required help="The password you signed in with, to confirm it's you.">
            <DashboardInput name="current" type="password" autoComplete="current-password" placeholder="Current password" maxLength={200} />
          </DashboardField>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <DashboardField label="New password" required help="At least 10 characters. A few unrelated words make a strong one that's easy to remember.">
            <DashboardInput name="password" type="password" autoComplete="new-password" placeholder="New password" maxLength={200} />
          </DashboardField>
          <DashboardField label="New password again" required help="The same again, to catch a typo.">
            <DashboardInput name="confirm" type="password" autoComplete="new-password" placeholder="New password again" maxLength={200} />
          </DashboardField>
        </div>
      </DashboardForm>

      <DashboardCard className="p-5 sm:p-6">
        <h2 className="font-display text-2xl font-semibold text-strong">Who can sign in</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          Only accounts on this list can use the dashboard. New people are added in Supabase (Authentication → Users, then the admins table).
        </p>
        <ul className="mt-5 grid gap-3">
          {(admins ?? []).map((admin) => (
            <li key={admin.email} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-card border border-line bg-raised px-4 py-3 text-sm">
              <span className="flex min-w-0 items-center gap-3">
                <span className="break-all font-medium text-strong">{admin.email}</span>
                {admin.email === user.email ? <StatusBadge tone="gold">You</StatusBadge> : null}
              </span>
              <span className="font-mono text-xs text-muted">since {formatDateTime(admin.created_at)}</span>
            </li>
          ))}
        </ul>
      </DashboardCard>
    </div>
  );
}
