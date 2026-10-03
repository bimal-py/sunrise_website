import { DashboardForm } from "@/features/dashboard/presentation/components/ui/dashboard-form";
import { saveRootFile } from "@/features/root-files/presentation/actions/root-files";
import { RootFileFields, type RootFileValues } from "./root-file-fields";

/** Create (no `file`) or edit a root file, in the portfolio's form card. Saving goes back to the list. */
export function RootFileForm({ file }: { file?: RootFileValues & { id: string } }) {
  return (
    <DashboardForm action={saveRootFile} submitLabel={file ? "Save root file" : "Create root file"} pendingLabel={file ? "Saving…" : "Creating…"}>
      {file ? <input type="hidden" name="id" value={file.id} /> : null}
      <RootFileFields
        file={file ? { file_name: file.file_name, content_type: file.content_type, body: file.body, storage_path: file.storage_path, published: file.published, note: file.note } : null}
      />
    </DashboardForm>
  );
}
