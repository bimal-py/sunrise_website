import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { DashboardPageHeader } from "@/features/dashboard/presentation/components/ui/dashboard-page-header";
import { RedirectForm } from "@/features/redirects/presentation/components/redirect-form";

export const metadata: Metadata = { title: "Edit redirect" };

type PageProps = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditRedirectPage({ params }: PageProps) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const { data: redirect, error } = await supabase.from("redirects").select("id, source, destination, permanent, note").eq("id", id).maybeSingle();
  if (error) throw new Error(`Couldn't load the redirect: ${error.message}`);
  if (!redirect) notFound();
  return (
    <div className="grid gap-8">
      <DashboardPageHeader eyebrow="Settings" title={`Edit: ${redirect.source}`} description="Change where this old address sends visitors, or whether the move is permanent." />
      <RedirectForm redirect={redirect} />
    </div>
  );
}
