import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { routes } from "@/lib/routes";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { pickableFilms } from "@/features/dashboard/data/pickers";
import { ConfirmSubmit } from "@/features/dashboard/presentation/components/form-controls";
import { PageHeader, Panel, rowLinkClass } from "@/features/dashboard/presentation/components/ui";
import { deleteService } from "@/features/services/presentation/actions/services";
import { ServiceForm } from "@/features/services/presentation/components/service-form";

export const metadata: Metadata = { title: "Edit service" };

type PageProps = { params: Promise<{ id: string }> };

export default async function EditServiceFormPage({ params }: PageProps) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const [{ data: row }, films, { data: prints }] = await Promise.all([
    supabase.from("services").select("*").eq("id", id).maybeSingle(),
    pickableFilms(supabase),
    supabase.from("prints").select("id, name").order("sort_order"),
  ]);
  if (!row) notFound();

  return (
    <>
      <PageHeader
        eyebrow="Services"
        title={row.name}
        actions={
          <div className="flex flex-wrap items-center gap-4">
            <a href={routes.dashboardSection("services")} className={rowLinkClass}>
              ← All services
            </a>
            {row.published && (
              <a href={routes.service(row.slug)} target="_blank" rel="noopener noreferrer" className={rowLinkClass}>
                View on the site <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </a>
            )}
          </div>
        }
      />
      <Panel>
        <ServiceForm service={row} films={films} prints={prints ?? []} />
      </Panel>
      <Panel title="Delete this service" description="Unpublishing hides it and is reversible. Deleting removes it; its address then sends visitors to the services page." className="mt-6">
        <form action={deleteService}>
          <input type="hidden" name="id" value={row.id} />
          <ConfirmSubmit confirm={`Delete “${row.name}”? This can't be undone.`}>Delete service</ConfirmSubmit>
        </form>
      </Panel>
    </>
  );
}
