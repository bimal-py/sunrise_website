import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { routes } from "@/lib/routes";
import { movePrint } from "@/features/prints/presentation/actions/prints";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { OfferingList } from "@/features/dashboard/presentation/components/offering-list";
import { PageHeader } from "@/features/dashboard/presentation/components/ui";
import { SpriteButton } from "@/shared/components/ui/sprite-button";

export const metadata: Metadata = { title: "Prints" };

const MOCKUP_LABEL: Record<string, string> = { album: "Album", frame: "Frame", canvas: "Canvas", "loose-prints": "Loose prints", book: "Photo book" };

export default async function DashboardPrintsPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("prints").select("id, slug, name, icon, summary, published, featured, mockup").order("sort_order").order("created_at");
  if (error) throw new Error(`Couldn't load prints: ${error.message}`);
  return (
    <>
      <PageHeader
        eyebrow="Prints"
        title="Prints and albums"
        description="Albums, frames, canvas and prints, in the order the site shows them. Prints with a mock-up hang on the home page's darkroom line."
        actions={
          <SpriteButton href={routes.dashboardNew("prints")}>
            <Plus className="h-4 w-4" aria-hidden /> New print
          </SpriteButton>
        }
      />
      <OfferingList
        rows={data.map((p) => ({ ...p, note: p.mockup ? `On the line: ${MOCKUP_LABEL[p.mockup]}` : undefined }))}
        section="prints"
        publicPath={routes.print}
        move={movePrint}
        emptyText="Add the first print product."
      />
    </>
  );
}
