import type { Metadata } from "next";
import { routes } from "@/lib/routes";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { nextSortOrder, pickableFilms } from "@/features/dashboard/data/pickers";
import { DashboardButton } from "@/features/dashboard/presentation/components/ui/dashboard-button";
import { DashboardPageHeader } from "@/features/dashboard/presentation/components/ui/dashboard-page-header";
import { ServiceForm, type ServiceDraft } from "@/features/services/presentation/components/service-form";

export const metadata: Metadata = { title: "New service" };

export default async function NewServicePage() {
  const { supabase } = await requireAdmin();
  const [films, sortOrder, { data: prints }] = await Promise.all([
    pickableFilms(supabase),
    nextSortOrder(supabase, "services"),
    supabase.from("prints").select("id, name").order("sort_order").order("created_at"),
  ]);
  const blank: ServiceDraft = {
    id: "",
    slug: "",
    name: "",
    name_ne: "",
    icon: "Camera",
    icon_source: "",
    icon_svg: null,
    summary: "",
    intro: [],
    sections: [],
    faqs: [],
    inquiry: "",
    service_type: "",
    featured: false,
    // New pages start as drafts (as on the portfolio): publish once they read well.
    published: false,
    sort_order: sortOrder,
    og_image: null,
    seo_title: "",
    seo_description: "",
    short_name: "",
    cover_film_id: null,
    film_category: null,
    related_print_ids: [],
  };
  return (
    <div className="grid gap-8">
      <DashboardPageHeader
        eyebrow="Services"
        title="Create a new service"
        description="Write the page the way you'd explain it to a client. Save it as a draft until it reads well, then publish it."
        actions={<DashboardButton href={routes.dashboardSection("services")}>Back to services</DashboardButton>}
      />
      <ServiceForm service={blank} films={films} prints={prints ?? []} />
    </div>
  );
}
