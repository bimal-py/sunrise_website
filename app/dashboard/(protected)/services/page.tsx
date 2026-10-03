import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { routes } from "@/lib/routes";
import { requireAdmin } from "@/features/dashboard/data/auth";
import {
  applyOfferingListQuery,
  canReorder,
  OfferingList,
  offeringFilterFields,
  parseOfferingListQuery,
} from "@/features/dashboard/presentation/components/offering-list";
import { DashboardPageHeader } from "@/features/dashboard/presentation/components/ui/dashboard-page-header";
import { DashboardNotice } from "@/features/dashboard/presentation/components/ui/dashboard-ui";
import { DashboardFilterBar } from "@/features/dashboard/presentation/components/ui/filter-bar";
import { deleteService, moveService } from "@/features/services/presentation/actions/services";

export const metadata: Metadata = { title: "Services" };

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)?.slice(0, 200) ?? "";

export default async function DashboardServicesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("services")
    .select("id, slug, name, name_ne, summary, published, featured, sort_order, updated_at, created_at")
    .order("sort_order")
    .order("created_at");
  if (error) throw new Error(`Couldn't load the services: ${error.message}`);

  const query = parseOfferingListQuery(params);
  const rows = applyOfferingListQuery(data, query);
  const saved = one(params.saved);
  const moved = one(params.moved);
  const deleted = one(params.deleted);

  return (
    <div className="grid gap-8">
      <DashboardPageHeader
        eyebrow="Services"
        title="What the studio shoots, in the site's order."
        description="Each service is a page on the site and a card on the services page. Featured ones (four look best) appear on the home page's shot list; the arrows change the order."
        primaryAction={{ href: routes.dashboardNew("services"), label: "Create new service", icon: <Plus size={15} aria-hidden /> }}
      />
      {saved ? (
        <DashboardNotice>
          Saved “{saved}”.{moved ? ` Its old address now redirects to /services/${moved}.` : " The site shows it on the next visit."}
        </DashboardNotice>
      ) : null}
      {deleted ? <DashboardNotice>Deleted “{deleted}”. Its address now sends visitors to the services page.</DashboardNotice> : null}
      <DashboardFilterBar action={routes.dashboardSection("services")} fields={offeringFilterFields(query)} />
      <OfferingList
        rows={rows}
        kind="services"
        publicPath={routes.service}
        editPath={(id) => routes.dashboardItem("services", id)}
        deleteAction={deleteService}
        moveAction={canReorder(query) ? moveService : undefined}
        emptyTitle={data.length === 0 ? "No services yet" : "Nothing matches"}
        emptyText={data.length === 0 ? "Add the first thing the studio photographs or films with “Create new service”." : "No service matches these filters. Choose View: All to see every service."}
      />
    </div>
  );
}
