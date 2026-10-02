import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { routes } from "@/lib/routes";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { pickableFilms } from "@/features/dashboard/data/pickers";
import { ConfirmSubmit } from "@/features/dashboard/presentation/components/form-controls";
import { PageHeader, Panel, rowLinkClass } from "@/features/dashboard/presentation/components/ui";
import { deletePrint } from "@/features/prints/presentation/actions/prints";
import { PrintForm } from "@/features/prints/presentation/components/print-form";

export const metadata: Metadata = { title: "Edit print" };

type PageProps = { params: Promise<{ id: string }> };

export default async function EditPrintFormPage({ params }: PageProps) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const [{ data: row }, films] = await Promise.all([
    supabase.from("prints").select("*").eq("id", id).maybeSingle(),
    pickableFilms(supabase),
  ]);
  if (!row) notFound();

  return (
    <>
      <PageHeader
        eyebrow="Prints"
        title={row.name}
        actions={
          <div className="flex flex-wrap items-center gap-4">
            <a href={routes.dashboardSection("prints")} className={rowLinkClass}>
              ← All prints
            </a>
            {row.published && (
              <a href={routes.print(row.slug)} target="_blank" rel="noopener noreferrer" className={rowLinkClass}>
                View on the site <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </a>
            )}
          </div>
        }
      />
      <Panel>
        <PrintForm print={row} films={films} />
      </Panel>
      <Panel title="Delete this print" description="Unpublishing hides it and is reversible. Deleting removes it; its address then sends visitors to the prints page." className="mt-6">
        <form action={deletePrint}>
          <input type="hidden" name="id" value={row.id} />
          <ConfirmSubmit confirm={`Delete “${row.name}”? This can't be undone.`}>Delete print</ConfirmSubmit>
        </form>
      </Panel>
    </>
  );
}
