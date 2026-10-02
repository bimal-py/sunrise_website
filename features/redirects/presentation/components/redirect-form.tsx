import { ActionForm } from "@/features/dashboard/presentation/components/action-form";
import { Checkbox, Field, inputClass } from "@/features/dashboard/presentation/components/ui";
import { addRedirect } from "@/features/redirects/presentation/actions/redirects";

/** Add one redirect: old address → new address. */
export function RedirectForm() {
  return (
    <ActionForm action={addRedirect} submitLabel="Add redirect">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Old address" htmlFor="source" hint="A path on this site, e.g. /old-page or /blog/our-first-wedding. Pasting the whole old link works too.">
          <input id="source" name="source" required maxLength={1000} spellCheck={false} autoCapitalize="off" placeholder="/old-page" className={`${inputClass} font-mono`} />
        </Field>
        <Field label="New address" htmlFor="destination" hint="A path here (/films/sagar-weds-asmita) or a whole link to another site (https://…).">
          <input id="destination" name="destination" required maxLength={1000} spellCheck={false} autoCapitalize="off" placeholder="/films" className={`${inputClass} font-mono`} />
        </Field>
        <Field label="Note" htmlFor="note" hint="Why it's here, for you (optional)." className="sm:col-span-2">
          <input id="note" name="note" maxLength={300} className={inputClass} />
        </Field>
        <div className="sm:col-span-2">
          <Checkbox name="permanent" label="Permanent" defaultChecked hint="The page has moved for good: search engines move the old address's place in results to the new one. Untick for a temporary move." />
        </div>
      </div>
    </ActionForm>
  );
}
