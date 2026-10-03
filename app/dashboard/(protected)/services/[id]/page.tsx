import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { routes } from "@/lib/routes";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { pickableFilms } from "@/features/dashboard/data/pickers";
import { DashboardButton } from "@/features/dashboard/presentation/components/ui/dashboard-button";
import { DashboardPageHeader } from "@/features/dashboard/presentation/components/ui/dashboard-page-header";
import { ServiceForm } from "@/features/services/presentation/components/service-form";

export const metadata: Metadata = { title: "Edit service" };

type PageProps = { params: Promise<{ id: string }> };

export default async function EditServicePage({ params }: PageProps) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const [{ data: row }, films, { data: prints }] = await Promise.all([
    supabase.from("services").select("*").eq("id", id).maybeSingle(),
    pickableFilms(supabase),
    supabase.from("prints").select("id, name").order("sort_order").order("created_at"),
  ]);
  if (!row) notFound();

  return (
    <div className="grid gap-8">
      <DashboardPageHeader
        eyebrow="Services"
        title={`Edit: ${row.name}`}
        description="Update the page's words, icon, still and search details. Saving refreshes the site straight away."
        actions={
          <>
            <DashboardButton href={routes.dashboardSection("services")}>Back to services</DashboardButton>
            {row.published ? (
              <DashboardButton href={routes.service(row.slug)} newTab>
                Preview
              </DashboardButton>
            ) : null}
          </>
        }
      />
      <ServiceForm service={row} films={films} prints={prints ?? []} />
    </div>
  );
}
