import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { routes } from "@/lib/routes";
import type { Json } from "@/lib/supabase/types";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { ActionForm } from "@/features/dashboard/presentation/components/action-form";
import { ImageField } from "@/features/dashboard/presentation/components/image-field";
import { Field, inputClass, PageHeader, Panel, rowLinkClass, textareaClass } from "@/features/dashboard/presentation/components/ui";
import { getSiteSettings } from "@/features/site/data/settings.repository";
import {
  fieldDefault,
  fieldMax,
  getPageDefinition,
  isPageKey,
  savedText,
  SEO_DESCRIPTION_MAX,
  SEO_TITLE_MAX,
  type PageField,
  type StudioNames,
} from "@/features/site/domain/page-content";
import { savePage } from "@/features/site/presentation/actions/pages";

type PageProps = { params: Promise<{ key: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { key } = await params;
  return { title: isPageKey(key) ? `${getPageDefinition(key).label} · Pages` : "Pages" };
}

/** "Edited. Empty it to go back to “Now showing”." */
function editedNote(original: string): string {
  const flat = original.replace(/\n+/g, " / ");
  return `Edited. Empty it to go back to “${flat.length > 90 ? `${flat.slice(0, 88).trimEnd()}…` : flat}”.`;
}

/** Search engines show about this many characters before cutting a title or description off. */
function lengthHint(value: string, shown: number, otherwise: string): string {
  return value.length > shown ? `${value.length} characters: Google shows about ${shown}, so the end may be cut off.` : otherwise;
}

/** A copy field, pre-filled with what the page shows now: the saved words or the default. */
function CopyField({ field, content, studio }: { field: PageField; content: Record<string, Json>; studio: StudioNames }) {
  const id = `content-${field.name}`;
  const original = fieldDefault(field, studio);
  const saved = savedText(content, field.name);
  const hint = [field.hint, saved && original && editedNote(original)].filter(Boolean).join(" ");
  const shared = { id, name: `content.${field.name}`, maxLength: fieldMax(field), defaultValue: saved || original };
  return (
    <Field label={field.label} htmlFor={id} hint={hint || undefined} className={`${field.half ? "" : "sm:col-span-2"} ${field.newRow ? "sm:col-start-1" : ""}`}>
      {field.kind === "textarea" ? (
        <textarea {...shared} rows={field.rows ?? 3} className={textareaClass} />
      ) : (
        <input {...shared} lang={field.kind === "ne" ? "ne" : undefined} className={inputClass} />
      )}
    </Field>
  );
}

export default async function EditPageWordsPage({ params }: PageProps) {
  const { key } = await params;
  const { supabase } = await requireAdmin();
  if (!isPageKey(key)) notFound();
  const page = getPageDefinition(key);
  const [{ data: row, error }, site] = await Promise.all([supabase.from("pages").select("*").eq("key", key).maybeSingle(), getSiteSettings()]);
  if (error) throw new Error(`Couldn't load the page: ${error.message}`);
  const content = row?.content ?? {};

  // The form's sections: the fields' groups in order, the body, then search and sharing.
  const groups = new Map<string, PageField[]>();
  for (const field of page.fields) groups.set(field.group, [...(groups.get(field.group) ?? []), field]);
  const sections: { title: string; description?: string; fields: ReactNode }[] = [...groups].map(([title, fields]) => ({
    title,
    fields: fields.map((field) => <CopyField key={field.name} field={field} content={content} studio={site} />),
  }));
  if (page.body) {
    const saved = row?.body.trim() ? row.body : "";
    sections.push({
      title: page.body.label,
      fields: (
        <Field label="Paragraphs" htmlFor="body" hint={[page.body.hint, saved && "Edited. Empty it to go back to the original wording."].filter(Boolean).join(" ")} className="sm:col-span-2">
          <textarea id="body" name="body" rows={page.body.rows} maxLength={page.body.max} defaultValue={saved || fieldDefault(page.body, site)} className={textareaClass} />
        </Field>
      ),
    });
  }
  if (page.seo) {
    const seoTitle = row?.seo_title ?? "";
    const seoDescription = row?.seo_description ?? "";
    sections.push({
      title: "Search and sharing",
      description: `How ${page.path} appears in Google and in link previews. Empty fields use the page's own words, shown in grey.`,
      fields: (
        <>
          <Field
            label="Search title"
            htmlFor="seo_title"
            hint={lengthHint(seoTitle, 60, `Search results add “ | ${site.name}” after it. About 50–60 characters.`)}
            className="sm:col-span-2"
          >
            <input id="seo_title" name="seo_title" maxLength={SEO_TITLE_MAX} defaultValue={seoTitle} placeholder={page.seo.title} className={inputClass} />
          </Field>
          <Field label="Search description" htmlFor="seo_description" hint={lengthHint(seoDescription, 160, "About 150–160 characters.")} className="sm:col-span-2">
            <textarea id="seo_description" name="seo_description" rows={3} maxLength={SEO_DESCRIPTION_MAX} defaultValue={seoDescription} placeholder={page.seo.description} className={textareaClass} />
          </Field>
          <div className="sm:col-span-2">
            <ImageField
              name="og_image"
              label="Share image"
              collection="pages"
              defaultValue={row?.og_image ?? null}
              hint="Shown when this page is shared on WhatsApp or Facebook. Landscape works best. Empty: the default share image from Settings."
            />
          </div>
        </>
      ),
    });
  }

  return (
    <>
      <PageHeader
        eyebrow="Pages"
        title={page.label}
        description={`${page.summary}.${page.fields.length > 0 ? " Each field shows what the page says now: change the words and save, or empty a field to go back to the original wording." : ""}`}
        actions={
          <div className="flex flex-wrap items-center gap-4">
            <Link href={routes.dashboardSection("pages")} className={rowLinkClass}>
              ← All pages
            </Link>
            <a href={page.path} target="_blank" rel="noopener noreferrer" className={rowLinkClass}>
              View page <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </a>
          </div>
        }
      />
      {page.note && <p className="mb-5 rounded-card border border-line bg-surface px-4 py-3 text-sm text-muted">{page.note}</p>}

      {sections.length > 0 && (
        <Panel>
          <ActionForm action={savePage}>
            <input type="hidden" name="key" value={key} />
            {sections.map((section, index) => (
              <div key={section.title} className={index > 0 ? "border-t border-line pt-6" : undefined}>
                <fieldset className="min-w-0">
                  <legend className="font-sans text-base font-semibold text-strong">{section.title}</legend>
                  {section.description && <p className="mt-1 text-sm text-muted">{section.description}</p>}
                  <div className="mt-4 grid gap-5 sm:grid-cols-2">{section.fields}</div>
                </fieldset>
              </div>
            ))}
          </ActionForm>
        </Panel>
      )}

      {!page.seo && (
        <Panel
          title="Search and sharing"
          description="This page's search title is the home page title in Settings → Search and sharing; its description is the studio description (Settings → Studio) and its share image the default share image."
          className="mt-6"
        >
          <Link href={routes.dashboardSection("settings")} className={rowLinkClass}>
            Open Settings
          </Link>
        </Panel>
      )}
    </>
  );
}
