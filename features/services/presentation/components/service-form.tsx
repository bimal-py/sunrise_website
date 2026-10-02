import type { ServiceRow } from "@/lib/supabase/types";
import { filmCategories } from "@/features/films/domain/entities";
import { saveService } from "@/features/services/presentation/actions/services";
import { ActionForm } from "@/features/dashboard/presentation/components/action-form";
import { FilmPicker, type PickableFilm } from "@/features/dashboard/presentation/components/film-picker";
import { OfferingFields } from "@/features/dashboard/presentation/components/offering-fields";
import { Field, inputClass, labelClass, selectClass } from "@/features/dashboard/presentation/components/ui";

export type ServiceDraft = Omit<ServiceRow, "id" | "created_at" | "updated_at"> & { id: string };

export function ServiceForm({ service, films, prints }: { service: ServiceDraft; films: PickableFilm[]; prints: { id: string; name: string }[] }) {
  return (
    <ActionForm action={saveService} submitLabel={service.id ? "Save" : "Create service"}>
      <input type="hidden" name="id" value={service.id} />
      <OfferingFields d={service} kind="services" featuredHint="Shown on the home page's shot list (four look best).">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Short name" htmlFor="short_name" hint="A couple of words for lists, e.g. “Portraits”.">
            <input id="short_name" name="short_name" maxLength={60} defaultValue={service.short_name} className={inputClass} />
          </Field>
          <Field label="Films to show on its page" htmlFor="film_category" hint="“See our work” lists recent films of this kind.">
            <select id="film_category" name="film_category" defaultValue={service.film_category ?? ""} className={selectClass}>
              <option value="">None</option>
              {filmCategories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <FilmPicker name="cover_film_id" label="Still for the home page's shot list" films={films} defaultValue={service.cover_film_id ? [service.cover_film_id] : []} max={1} hint="A frame from one of the studio's films that shows this kind of shoot." />
        <fieldset>
          <legend className={labelClass}>Prints that go with it</legend>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {prints.map((print) => (
              <label key={print.id} className="flex cursor-pointer items-center gap-2 py-1 text-sm text-strong">
                <input type="checkbox" name="related_print_ids" value={print.id} defaultChecked={service.related_print_ids.includes(print.id)} className="size-4 accent-[color:var(--primary)]" />
                {print.name}
              </label>
            ))}
          </div>
        </fieldset>
      </OfferingFields>
    </ActionForm>
  );
}
