import type { Metadata } from "next";
import { routes } from "@/lib/routes";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { nextSortOrder, pickableFilms } from "@/features/dashboard/data/pickers";
import { PageHeader, Panel, rowLinkClass } from "@/features/dashboard/presentation/components/ui";
import { PrintForm } from "@/features/prints/presentation/components/print-form";

export const metadata: Metadata = { title: "New print" };

export default async function NewPrintFormPage() {
  const { supabase } = await requireAdmin();
  const [films, sortOrder] = await Promise.all([
    pickableFilms(supabase),
    nextSortOrder(supabase, "prints"),
  ]);
  const blank = {
    id: "", slug: "", name: "", name_ne: "", icon: "Camera" as const, icon_source: "", icon_svg: null, summary: "", intro: [], sections: [], faqs: [], inquiry: "",
    service_type: "", featured: false, published: true, sort_order: sortOrder, og_image: null, seo_title: "", seo_description: "",
    highlight: "", options_heading: "", options: [], mockup: null, preview_film_ids: [],
  };
  return (
    <>
      <PageHeader eyebrow="Prints" title="New print" actions={<a href={routes.dashboardSection("prints")} className={rowLinkClass}>← All prints</a>} />
      <Panel>
        <PrintForm print={blank} films={films} />
      </Panel>
    </>
  );
}
