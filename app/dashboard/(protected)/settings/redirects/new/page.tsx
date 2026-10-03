import type { Metadata } from "next";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { DashboardPageHeader } from "@/features/dashboard/presentation/components/ui/dashboard-page-header";
import { RedirectForm } from "@/features/redirects/presentation/components/redirect-form";

export const metadata: Metadata = { title: "Add a redirect" };

export default async function NewRedirectPage() {
  await requireAdmin();
  return (
    <div className="grid gap-8">
      <DashboardPageHeader
        eyebrow="Settings"
        title="Add a redirect"
        description="Point an old address at its new one, so old links and search results land on the right page."
      />
      <RedirectForm />
    </div>
  );
}
