import type { PrintRow } from "@/lib/supabase/types";
import { savePrint } from "@/features/prints/presentation/actions/prints";
import { ActionForm } from "@/features/dashboard/presentation/components/action-form";
import { FilmPicker, type PickableFilm } from "@/features/dashboard/presentation/components/film-picker";
import { OfferingFields } from "@/features/dashboard/presentation/components/offering-fields";
import { RepeatableField } from "@/features/dashboard/presentation/components/repeatable-field";
import { Field, inputClass, selectClass } from "@/features/dashboard/presentation/components/ui";

export type PrintDraft = Omit<PrintRow, "id" | "created_at" | "updated_at"> & { id: string };

const MOCKUPS = [
  { value: "", label: "Not on the line" },
  { value: "album", label: "Open album (2 stills)" },
  { value: "frame", label: "Framed print (1 still)" },
  { value: "canvas", label: "Canvas (1 still)" },
  { value: "loose-prints", label: "Three loose prints (3 stills)" },
  { value: "book", label: "Photo book (1 still)" },
];

export function PrintForm({ print, films }: { print: PrintDraft; films: PickableFilm[] }) {
  return (
    <ActionForm action={savePrint} submitLabel={print.id ? "Save" : "Create print"}>
      <input type="hidden" name="id" value={print.id} />
      <OfferingFields d={print} kind="prints" featuredHint="Marks it as one of the main prints.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Short fact for cards" htmlFor="highlight" hint="e.g. “5×7 to 20×30 in”.">
            <input id="highlight" name="highlight" maxLength={80} defaultValue={print.highlight} className={inputClass} />
          </Field>
          <Field label="On the home page's darkroom line" htmlFor="mockup" hint="Which object hangs on the drying line for it.">
            <select id="mockup" name="mockup" defaultValue={print.mockup ?? ""} className={selectClass}>
              {MOCKUPS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <FilmPicker name="preview_film_ids" label="Stills inside its mock-up" films={films} defaultValue={print.preview_film_ids} max={3} hint="In order: the album shows the first two, loose prints three, the others one." />
        <Field label="Heading above the options table" htmlFor="options_heading" hint="e.g. “Common sizes”, “Things to decide”.">
          <input id="options_heading" name="options_heading" maxLength={80} defaultValue={print.options_heading} className={inputClass} />
        </Field>
        <RepeatableField
          name="options"
          label="Options (sizes or finishes)"
          columns={[
            { key: "label", label: "Size or option", hint: "e.g. 8×12 in" },
            { key: "detail", label: "What it's good for" },
          ]}
          defaultValue={print.options}
          addLabel="Add an option"
        />
      </OfferingFields>
    </ActionForm>
  );
}
