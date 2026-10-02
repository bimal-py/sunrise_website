import type { Metadata } from "next";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { PageHeader } from "@/features/dashboard/presentation/components/ui";
import { FileManagerView } from "@/features/file-manager/presentation/components/file-manager-view";

export const metadata: Metadata = { title: "File Manager" };

export default async function FileManagerPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader
        eyebrow="File Manager"
        title="Files and photos"
        description="The photos uploaded through the dashboard, in every size the site uses, and other files such as PDFs. Copy a link to use one anywhere."
      />
      <FileManagerView />
    </>
  );
}
