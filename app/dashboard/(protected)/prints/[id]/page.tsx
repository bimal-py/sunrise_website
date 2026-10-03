import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { routes } from "@/lib/routes";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { pickableFilms } from "@/features/dashboard/data/pickers";
import { DashboardButton } from "@/features/dashboard/presentation/components/ui/dashboard-button";
import { DashboardPageHeader } from "@/features/dashboard/presentation/components/ui/dashboard-page-header";
import { PrintForm } from "@/features/prints/presentation/components/print-form";

export const metadata: Metadata = { title: "Edit print" };

type PageProps = { params: Promise<{ id: string }> };

export default async function EditPrintPage({ params }: PageProps) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const [{ data: row }, films] = await Promise.all([supabase.from("prints").select("*").eq("id", id).maybeSingle(), pickableFilms(supabase)]);
  if (!row) notFound();

  return (
    <div className="grid gap-8">
      <DashboardPageHeader
        eyebrow="Prints"
        title={`Edit: ${row.name}`}
        description="Update the page's words, icon, mock-up, options and search details. Saving refreshes the site straight away."
        actions={
          <>
            <DashboardButton href={routes.dashboardSection("prints")}>Back to prints</DashboardButton>
            {row.published ? (
              <DashboardButton href={routes.print(row.slug)} newTab>
                Preview
              </DashboardButton>
            ) : null}
          </>
        }
      />
      <PrintForm print={row} films={films} />
    </div>
  );
}
