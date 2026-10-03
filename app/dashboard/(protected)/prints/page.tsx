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
import { deletePrint, movePrint } from "@/features/prints/presentation/actions/prints";

export const metadata: Metadata = { title: "Prints" };

const MOCKUP_LABEL: Record<string, string> = { album: "Album", frame: "Frame", canvas: "Canvas", "loose-prints": "Loose prints", book: "Photo book" };

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)?.slice(0, 200) ?? "";

export default async function DashboardPrintsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("prints")
    .select("id, slug, name, name_ne, summary, published, featured, sort_order, updated_at, created_at, mockup")
    .order("sort_order")
    .order("created_at");
  if (error) throw new Error(`Couldn't load the prints: ${error.message}`);

  const query = parseOfferingListQuery(params);
  const rows = applyOfferingListQuery(
    data.map((print) => ({ ...print, note: print.mockup ? `On the line: ${MOCKUP_LABEL[print.mockup]}` : undefined })),
    query,
  );
  const saved = one(params.saved);
  const moved = one(params.moved);
  const deleted = one(params.deleted);

  return (
    <div className="grid gap-8">
      <DashboardPageHeader
        eyebrow="Prints"
        title="Albums, frames and prints, in the site's order."
        description="Each print is a page on the site and a card on the prints page. Prints with a mock-up hang on the home page's darkroom line; the arrows change the order."
        primaryAction={{ href: routes.dashboardNew("prints"), label: "Create new print", icon: <Plus size={15} aria-hidden /> }}
      />
      {saved ? (
        <DashboardNotice>
          Saved “{saved}”.{moved ? ` Its old address now redirects to /prints/${moved}.` : " The site shows it on the next visit."}
        </DashboardNotice>
      ) : null}
      {deleted ? <DashboardNotice>Deleted “{deleted}”. Its address now sends visitors to the prints page.</DashboardNotice> : null}
      <DashboardFilterBar action={routes.dashboardSection("prints")} fields={offeringFilterFields(query)} />
      <OfferingList
        rows={rows}
        kind="prints"
        publicPath={routes.print}
        editPath={(id) => routes.dashboardItem("prints", id)}
        deleteAction={deletePrint}
        moveAction={canReorder(query) ? movePrint : undefined}
        emptyTitle={data.length === 0 ? "No prints yet" : "Nothing matches"}
        emptyText={data.length === 0 ? "Add the first album, frame or print with “Create new print”." : "No print matches these filters. Choose View: All to see every print."}
      />
    </div>
  );
}
