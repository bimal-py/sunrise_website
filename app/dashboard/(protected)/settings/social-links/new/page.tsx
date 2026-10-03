import type { Metadata } from "next";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { DashboardPageHeader } from "@/features/dashboard/presentation/components/ui/dashboard-page-header";
import { SocialLinkForm } from "@/features/site/presentation/dashboard/social-link-form";

export const metadata: Metadata = { title: "New social link" };

export default async function NewSocialLinkPage() {
  await requireAdmin();
  return (
    <div className="grid gap-8">
      <DashboardPageHeader
        eyebrow="Settings"
        title="Create a social link"
        description="Add any profile the studio has and decide whether it shows on the site: as an icon in the footer, the home page and the contact page."
      />
      <SocialLinkForm link={null} />
    </div>
  );
}
