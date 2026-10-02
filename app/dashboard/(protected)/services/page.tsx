import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { routes } from "@/lib/routes";
import { moveService } from "@/features/services/presentation/actions/services";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { OfferingList } from "@/features/dashboard/presentation/components/offering-list";
import { PageHeader } from "@/features/dashboard/presentation/components/ui";
import { SpriteButton } from "@/shared/components/ui/sprite-button";

export const metadata: Metadata = { title: "Services" };

export default async function DashboardServicesPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("services").select("id, slug, name, icon, summary, published, featured").order("sort_order").order("created_at");
  if (error) throw new Error(`Couldn't load services: ${error.message}`);
  return (
    <>
      <PageHeader
        eyebrow="Services"
        title="Services"
        description="What the studio photographs and films, in the order the site shows them. Featured ones (four look best) appear on the home page's shot list."
        actions={
          <SpriteButton href={routes.dashboardNew("services")}>
            <Plus className="h-4 w-4" aria-hidden /> New service
          </SpriteButton>
        }
      />
      <OfferingList rows={data} section="services" publicPath={routes.service} move={moveService} emptyText="Add the first service the studio offers." />
    </>
  );
}
