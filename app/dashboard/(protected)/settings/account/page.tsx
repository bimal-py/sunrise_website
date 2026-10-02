import type { Metadata } from "next";
import { formatDateTime } from "@/lib/utils/date";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { changePassword } from "@/features/dashboard/presentation/actions/auth";
import { ActionForm } from "@/features/dashboard/presentation/components/action-form";
import { SettingsTabs } from "@/features/dashboard/presentation/components/settings-tabs";
import { Field, inputClass, PageHeader, Panel } from "@/features/dashboard/presentation/components/ui";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const { supabase, user } = await requireAdmin();
  const { data: admins } = await supabase.from("admins").select("email, created_at");
  return (
    <>
      <PageHeader eyebrow="Settings" title="Your account" description={`Signed in as ${user.email}.`} />
      <SettingsTabs />
      <div className="flex flex-col gap-6">
        <Panel title="Change password" description="At least 10 characters. Other dashboard users keep their own passwords.">
          <ActionForm action={changePassword} submitLabel="Change password">
            <input type="email" name="username" autoComplete="username" defaultValue={user.email ?? ""} hidden readOnly />
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="New password" htmlFor="password">
                <input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} className={inputClass} />
              </Field>
              <Field label="New password again" htmlFor="confirm">
                <input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={10} className={inputClass} />
              </Field>
            </div>
          </ActionForm>
        </Panel>
        <Panel title="Who can sign in" description="Only accounts on this list can use the dashboard. New people are added in Supabase (Authentication → Users, then the admins table).">
          <ul className="divide-y divide-line">
            {(admins ?? []).map((admin) => (
              <li key={admin.email} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span className="text-strong">{admin.email}</span>
                <span className="font-mono text-xs text-muted">since {formatDateTime(admin.created_at)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
