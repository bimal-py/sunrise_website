import type { ServiceRow } from "@/lib/supabase/types";
import { filmCategories } from "@/features/films/domain/entities";
import { saveService } from "@/features/services/presentation/actions/services";
import { FilmPicker, type PickableFilm } from "@/features/dashboard/presentation/components/film-picker";
import { OfferingFields } from "@/features/dashboard/presentation/components/offering-fields";
import { DashboardForm } from "@/features/dashboard/presentation/components/ui/dashboard-form";
import { DashboardCheckbox, DashboardField, DashboardInput, DashboardSelect } from "@/features/dashboard/presentation/components/ui/dashboard-ui";

export type ServiceDraft = Omit<ServiceRow, "id" | "created_at" | "updated_at"> & { id: string };

/** The service editor (new and edit): the shared offering fields plus the shot list still, films and related prints. */
export function ServiceForm({ service, films, prints }: { service: ServiceDraft; films: PickableFilm[]; prints: { id: string; name: string }[] }) {
  const editing = Boolean(service.id);
  return (
    <DashboardForm action={saveService} submitLabel={editing ? "Save service" : "Create service"} pendingLabel={editing ? "Saving…" : "Creating…"}>
      <input type="hidden" name="id" value={service.id} />
      <OfferingFields d={service} kind="services" featuredHint="Shown on the home page's shot list (four look best).">
        <div className="grid gap-5 md:grid-cols-2">
          <DashboardField label="Short name" help="A couple of words for lists, like the home page's “And many more” row. Blank uses the name." example="Portraits">
            <DashboardInput name="short_name" defaultValue={service.short_name} maxLength={60} placeholder="Short name (optional)" />
          </DashboardField>
          <DashboardField label="Films on its page" help="“See our work” on the service's page lists the newest films of this kind. None hides that part.">
            <DashboardSelect name="film_category" defaultValue={service.film_category ?? ""}>
              <option value="">None</option>
              {filmCategories.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.label}
                </option>
              ))}
            </DashboardSelect>
          </DashboardField>
        </div>
        <FilmPicker
          name="cover_film_id"
          label="Still for the home page's shot list"
          films={films}
          defaultValue={service.cover_film_id ? [service.cover_film_id] : []}
          max={1}
          help="A frame from one of the studio's films that shows this kind of shoot. It appears when the service is pointed at on the home page."
        />
        <DashboardField as="div" label="Prints that go with it" help="Listed on the service's page, and the service on theirs.">
          {prints.length === 0 ? (
            <p className="text-sm text-muted">No prints yet.</p>
          ) : (
            <div className="flex flex-wrap gap-x-6">
              {prints.map((print) => (
                <DashboardCheckbox key={print.id} name="related_print_ids" value={print.id} label={print.name} defaultChecked={service.related_print_ids.includes(print.id)} />
              ))}
            </div>
          )}
        </DashboardField>
      </OfferingFields>
    </DashboardForm>
  );
}
