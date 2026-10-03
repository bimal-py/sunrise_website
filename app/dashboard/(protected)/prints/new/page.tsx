import type { Metadata } from "next";
import { routes } from "@/lib/routes";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { nextSortOrder, pickableFilms } from "@/features/dashboard/data/pickers";
import { DashboardButton } from "@/features/dashboard/presentation/components/ui/dashboard-button";
import { DashboardPageHeader } from "@/features/dashboard/presentation/components/ui/dashboard-page-header";
import { PrintForm, type PrintDraft } from "@/features/prints/presentation/components/print-form";

export const metadata: Metadata = { title: "New print" };

export default async function NewPrintPage() {
  const { supabase } = await requireAdmin();
  const [films, sortOrder] = await Promise.all([pickableFilms(supabase), nextSortOrder(supabase, "prints")]);
  const blank: PrintDraft = {
    id: "",
    slug: "",
    name: "",
    name_ne: "",
    icon: "Image",
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
    highlight: "",
    options_heading: "",
    options: [],
    mockup: null,
    preview_film_ids: [],
  };
  return (
    <div className="grid gap-8">
      <DashboardPageHeader
        eyebrow="Prints"
        title="Create a new print"
        description="Describe the product the way you'd show it at the counter. Save it as a draft until it reads well, then publish it."
        actions={<DashboardButton href={routes.dashboardSection("prints")}>Back to prints</DashboardButton>}
      />
      <PrintForm print={blank} films={films} />
    </div>
  );
}
