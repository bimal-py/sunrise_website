import type { Metadata } from "next";
import { routes } from "@/lib/routes";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { nextSortOrder, pickableFilms } from "@/features/dashboard/data/pickers";
import { PageHeader, Panel, rowLinkClass } from "@/features/dashboard/presentation/components/ui";
import { ServiceForm } from "@/features/services/presentation/components/service-form";

export const metadata: Metadata = { title: "New service" };

export default async function NewServiceFormPage() {
  const { supabase } = await requireAdmin();
  const [films, sortOrder, { data: prints }] = await Promise.all([
    pickableFilms(supabase),
    nextSortOrder(supabase, "services"),
    supabase.from("prints").select("id, name").order("sort_order"),
  ]);
  const blank = {
    id: "", slug: "", name: "", name_ne: "", icon: "Camera" as const, summary: "", intro: [], sections: [], faqs: [], inquiry: "",
    service_type: "", featured: false, published: true, sort_order: sortOrder, og_image: null, seo_title: "", seo_description: "",
    short_name: "", cover_film_id: null, film_category: null, related_print_ids: [],
  };
  return (
    <>
      <PageHeader eyebrow="Services" title="New service" actions={<a href={routes.dashboardSection("services")} className={rowLinkClass}>← All services</a>} />
      <Panel>
        <ServiceForm service={blank} films={films} prints={prints ?? []} />
      </Panel>
    </>
  );
}
