import type { RootFileRow } from "@/lib/supabase/types";
import { ActionForm } from "@/features/dashboard/presentation/components/action-form";
import { Checkbox, Field, inputClass, monoTextareaClass, selectClass } from "@/features/dashboard/presentation/components/ui";
import { DEFAULT_ROOT_FILE_TYPE, ROOT_FILE_MAX_BODY, ROOT_FILE_TYPES } from "@/features/root-files/domain/root-file";
import { saveRootFile } from "@/features/root-files/presentation/actions/root-files";

type Values = Pick<RootFileRow, "id" | "file_name" | "content_type" | "body" | "published" | "note">;

/** Create (no `file`) or edit a root file. */
export function RootFileForm({ file }: { file?: Values }) {
  const types = file && !ROOT_FILE_TYPES.some((t) => t.value === file.content_type) ? [...ROOT_FILE_TYPES, { value: file.content_type, label: file.content_type }] : ROOT_FILE_TYPES;
  return (
    <ActionForm action={saveRootFile} submitLabel={file ? "Save" : "Create file"}>
      {file && <input type="hidden" name="id" value={file.id} />}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="File name" htmlFor="file_name" hint="Exactly as the service names it, e.g. google1234abcd.html, BingSiteAuth.xml or ads.txt. It's served at /<file name>.">
          <input id="file_name" name="file_name" required maxLength={109} spellCheck={false} autoCapitalize="off" placeholder="ads.txt" defaultValue={file?.file_name} className={`${inputClass} font-mono`} />
        </Field>
        <Field label="Kind of file" htmlFor="content_type" hint="Match the extension: .html is HTML, .xml is XML.">
          <select id="content_type" name="content_type" defaultValue={file?.content_type ?? DEFAULT_ROOT_FILE_TYPE} className={selectClass}>
            {types.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Contents"
          htmlFor="body"
          hint="Paste what the service gave you. Google's HTML file is one line, e.g. “google-site-verification: google1234abcd.html”; Bing's BingSiteAuth.xml is a few lines of XML."
          className="sm:col-span-2"
        >
          <textarea id="body" name="body" rows={12} maxLength={ROOT_FILE_MAX_BODY} spellCheck={false} defaultValue={file?.body} className={monoTextareaClass} />
        </Field>
        <Field label="Note" htmlFor="note" hint="What it's for, for you (not published), e.g. “Google Search Console verification”." className="sm:col-span-2">
          <input id="note" name="note" maxLength={300} defaultValue={file?.note} className={inputClass} />
        </Field>
        <div className="sm:col-span-2">
          <Checkbox name="published" label="Published" defaultChecked={file?.published ?? true} hint="Untick to take the file down without deleting it (its address then answers “not found”)." />
        </div>
      </div>
    </ActionForm>
  );
}
