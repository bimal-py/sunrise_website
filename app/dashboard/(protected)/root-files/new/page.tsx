import type { Metadata } from "next";
import { routes } from "@/lib/routes";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { PageHeader, Panel, rowLinkClass } from "@/features/dashboard/presentation/components/ui";
import { RootFileForm } from "@/features/root-files/presentation/components/root-file-form";

export const metadata: Metadata = { title: "New root file" };

export default async function NewRootFilePage() {
  await requireAdmin();
  return (
    <>
      <PageHeader
        eyebrow="Root Files"
        title="New root file"
        description="Served at the top of the site under its own name, e.g. /ads.txt."
        actions={
          <a href={routes.dashboardSection("root-files")} className={rowLinkClass}>
            ← All root files
          </a>
        }
      />
      <Panel>
        <RootFileForm />
      </Panel>
    </>
  );
}
