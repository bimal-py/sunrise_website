import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { DashboardPageHeader } from "@/features/dashboard/presentation/components/ui/dashboard-page-header";
import { RootFileForm } from "@/features/root-files/presentation/components/root-file-form";

export const metadata: Metadata = { title: "Edit root file" };

type PageProps = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditRootFilePage({ params }: PageProps) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const { data: file, error } = await supabase.from("root_files").select("id, file_name, content_type, body, storage_path, published, note").eq("id", id).maybeSingle();
  if (error) throw new Error(`Couldn't load the file: ${error.message}`);
  if (!file) notFound();

  return (
    <div className="grid gap-8">
      <DashboardPageHeader
        eyebrow="Root Files"
        title={`Edit: ${file.file_name}`}
        description={
          file.published
            ? `Published: anyone can open it at /${file.file_name}. Update its contents, content type or file here.`
            : `Draft: /${file.file_name} answers “not found” until you publish it.`
        }
      />
      <RootFileForm file={file} />
    </div>
  );
}
