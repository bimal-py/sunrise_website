import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { DashboardPageHeader } from "@/features/dashboard/presentation/components/ui/dashboard-page-header";
import { SocialLinkForm } from "@/features/site/presentation/dashboard/social-link-form";

export const metadata: Metadata = { title: "Edit social link" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditSocialLinkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const { data: link, error } = await supabase.from("social_links").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Couldn't load the social link: ${error.message}`);
  if (!link) notFound();

  return (
    <div className="grid gap-8">
      <DashboardPageHeader
        eyebrow="Settings"
        title={`Edit: ${link.label}`}
        description="Update the platform, label, link, icon, order and visibility of this social link."
      />
      <SocialLinkForm link={link} />
    </div>
  );
}
