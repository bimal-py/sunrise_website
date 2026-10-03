import type { PrintRow } from "@/lib/supabase/types";
import { savePrint } from "@/features/prints/presentation/actions/prints";
import { FilmPicker, type PickableFilm } from "@/features/dashboard/presentation/components/film-picker";
import { OfferingFields } from "@/features/dashboard/presentation/components/offering-fields";
import { RepeatableField } from "@/features/dashboard/presentation/components/repeatable-field";
import { DashboardForm } from "@/features/dashboard/presentation/components/ui/dashboard-form";
import { DashboardField, DashboardInput, DashboardSelect } from "@/features/dashboard/presentation/components/ui/dashboard-ui";

export type PrintDraft = Omit<PrintRow, "id" | "created_at" | "updated_at"> & { id: string };

const MOCKUPS = [
  { value: "", label: "Not on the line" },
  { value: "album", label: "Open album (2 stills)" },
  { value: "frame", label: "Framed print (1 still)" },
  { value: "canvas", label: "Canvas (1 still)" },
  { value: "loose-prints", label: "Three loose prints (3 stills)" },
  { value: "book", label: "Photo book (1 still)" },
];

/** The print editor (new and edit): the shared offering fields plus the darkroom mock-up, its stills and the options table. */
export function PrintForm({ print, films }: { print: PrintDraft; films: PickableFilm[] }) {
  const editing = Boolean(print.id);
  return (
    <DashboardForm action={savePrint} submitLabel={editing ? "Save print" : "Create print"} pendingLabel={editing ? "Saving…" : "Creating…"}>
      <input type="hidden" name="id" value={print.id} />
      <OfferingFields d={print} kind="prints" featuredHint="One of the main prints: shown first where the site lists a few.">
        <div className="grid gap-5 md:grid-cols-2">
          <DashboardField label="On the home page's darkroom line" help="Which object hangs on the drying line on the home page for this print. “Not on the line” leaves it off.">
            <DashboardSelect name="mockup" defaultValue={print.mockup ?? ""}>
              {MOCKUPS.map((mockup) => (
                <option key={mockup.value} value={mockup.value}>
                  {mockup.label}
                </option>
              ))}
            </DashboardSelect>
          </DashboardField>
          <DashboardField label="Short fact for cards" help="One short line on the print's card, such as its sizes." example="5×7 to 20×30 in">
            <DashboardInput name="highlight" defaultValue={print.highlight} maxLength={80} placeholder="Short fact (optional)" />
          </DashboardField>
        </div>
        <FilmPicker
          name="preview_film_ids"
          label="Stills inside its mock-up"
          films={films}
          defaultValue={print.preview_film_ids}
          max={3}
          help="Frames from the studio's films shown inside the object on the darkroom line, in this order: the album shows the first two, the loose prints three, the others one."
        />
        <DashboardField label="Heading above the options table" help="The heading over the sizes or choices on the print's page." example="Common sizes">
          <DashboardInput name="options_heading" defaultValue={print.options_heading} maxLength={80} placeholder="Heading (optional)" />
        </DashboardField>
        <RepeatableField
          name="options"
          label="Options (sizes or finishes)"
          itemLabel="Option"
          help="Rows of the table on the print's page: a size or a finish, and what it's good for. Leave empty for made-to-order prints."
          example="8×12 in · Albums and table frames"
          columns={[
            { key: "label", label: "Size or option", maxLength: 120, placeholder: "8×12 in" },
            { key: "detail", label: "What it's good for", maxLength: 400 },
          ]}
          defaultValue={print.options}
          addLabel="Add an option"
        />
      </OfferingFields>
    </DashboardForm>
  );
}
