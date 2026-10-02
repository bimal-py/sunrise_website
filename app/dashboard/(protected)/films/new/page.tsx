import type { Metadata } from "next";
import { routes } from "@/lib/routes";
import { addFilm } from "@/features/films/presentation/actions/films";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { ActionForm } from "@/features/dashboard/presentation/components/action-form";
import { Field, inputClass, PageHeader, Panel, rowLinkClass } from "@/features/dashboard/presentation/components/ui";

export const metadata: Metadata = { title: "Add a film" };
export const maxDuration = 60;

export default async function NewFilmPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader
        eyebrow="Films"
        title="Add a film by link"
        description="For uploads older than the channel's newest 15 (Sync only sees those). The title, date and thumbnail come from YouTube; you can change them next."
        actions={
          <a href={routes.dashboardSection("films")} className={rowLinkClass}>
            ← All films
          </a>
        }
      />
      <Panel>
        <ActionForm action={addFilm} submitLabel="Add film">
          <Field label="YouTube link or video id" htmlFor="video" hint="e.g. https://www.youtube.com/watch?v=xZHzDT7CFSs or https://youtu.be/xZHzDT7CFSs">
            <input id="video" name="video" required className={inputClass} />
          </Field>
        </ActionForm>
      </Panel>
    </>
  );
}
