import type { Metadata } from "next";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { DashboardPageHeader } from "@/features/dashboard/presentation/components/ui/dashboard-page-header";
import { RootFileForm } from "@/features/root-files/presentation/components/root-file-form";

export const metadata: Metadata = { title: "Create a root file" };

export default async function NewRootFilePage() {
  await requireAdmin();
  return (
    <div className="grid gap-8">
      <DashboardPageHeader
        eyebrow="Root Files"
        title="Create a root public file"
        description="For a file that has to live at the top of the domain, such as /ads.txt or Google's google….html: type its text, or choose a file you've uploaded."
      />
      <RootFileForm />
    </div>
  );
}
