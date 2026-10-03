import type { RedirectRow } from "@/lib/supabase/types";
import { DashboardForm } from "@/features/dashboard/presentation/components/ui/dashboard-form";
import { DashboardCheckbox, DashboardField, DashboardInput } from "@/features/dashboard/presentation/components/ui/dashboard-ui";
import { saveRedirect } from "@/features/redirects/presentation/actions/redirects";

export type RedirectValues = Pick<RedirectRow, "id" | "source" | "destination" | "permanent" | "note">;

/** Add (no `redirect`) or change one redirect: old address → new address. Saving goes back to the list. */
export function RedirectForm({ redirect }: { redirect?: RedirectValues }) {
  return (
    <DashboardForm action={saveRedirect} submitLabel={redirect ? "Save redirect" : "Add redirect"} pendingLabel={redirect ? "Saving…" : "Adding…"}>
      {redirect ? <input type="hidden" name="id" value={redirect.id} /> : null}
      <div className="grid gap-5 md:grid-cols-2">
        <DashboardField
          label="Old address"
          required
          help="A path on this site that people or search results still use. Pasting the whole old link works too: only its path is kept."
          example="/blog/our-first-wedding"
        >
          <DashboardInput name="source" defaultValue={redirect?.source ?? ""} maxLength={1000} placeholder="/old-page" spellCheck={false} autoCapitalize="off" autoComplete="off" className="font-mono" />
        </DashboardField>
        <DashboardField label="New address" required help="Where visitors should land: a path on this site, or a whole link to another site." example="/films/sagar-weds-asmita">
          <DashboardInput
            name="destination"
            defaultValue={redirect?.destination ?? ""}
            maxLength={1000}
            placeholder="/films"
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            className="font-mono"
          />
        </DashboardField>
      </div>
      <DashboardField label="Note" help="Why the redirect is here, for you. It isn't published." example="Old Astro site's blog address">
        <DashboardInput name="note" defaultValue={redirect?.note ?? ""} maxLength={300} placeholder="Note (optional)" />
      </DashboardField>
      <DashboardCheckbox
        name="permanent"
        label="Permanent"
        defaultChecked={redirect?.permanent ?? true}
        hint="The page has moved for good: search engines move the old address's place in results to the new one. Untick for a temporary move."
      />
      <p className="text-xs leading-5 text-muted">
        Old film, service, print, product and blog addresses redirect as soon as you save. Any other old address starts redirecting after the site&apos;s next deploy.
      </p>
    </DashboardForm>
  );
}
