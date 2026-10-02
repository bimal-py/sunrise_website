import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { routes } from "@/lib/routes";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { ConfirmSubmit } from "@/features/dashboard/presentation/components/form-controls";
import { PageHeader, Panel, rowLinkClass } from "@/features/dashboard/presentation/components/ui";
import { deleteRootFile } from "@/features/root-files/presentation/actions/root-files";
import { RootFileForm } from "@/features/root-files/presentation/components/root-file-form";

export const metadata: Metadata = { title: "Edit root file" };

type PageProps = { params: Promise<{ id: string }> };

export default async function EditRootFilePage({ params }: PageProps) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data: file, error } = await supabase.from("root_files").select("id, file_name, content_type, body, published, note").eq("id", id).maybeSingle();
  if (error) throw new Error(`Couldn't load the file: ${error.message}`);
  if (!file) notFound();

  return (
    <>
      <PageHeader
        eyebrow="Root Files"
        title={`/${file.file_name}`}
        description={file.published ? "Published: anyone can open it at this address." : "Hidden: the address answers “not found” until you publish it."}
        actions={
          <div className="flex flex-wrap items-center gap-4">
            <a href={routes.dashboardSection("root-files")} className={rowLinkClass}>
              ← All root files
            </a>
            {file.published && (
              <a href={`/${file.file_name}`} target="_blank" rel="noopener noreferrer" className={rowLinkClass}>
                View <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </a>
            )}
          </div>
        }
      />
      <Panel>
        <RootFileForm file={file} />
      </Panel>

      <Panel title="Delete this file" description="Its address stops working. A service that checks it (Google Search Console, an ad network) may then drop its verification." className="mt-6">
        <form action={deleteRootFile}>
          <input type="hidden" name="id" value={file.id} />
          <ConfirmSubmit confirm={`Delete /${file.file_name}? This can't be undone.`}>Delete file</ConfirmSubmit>
        </form>
      </Panel>
    </>
  );
}
