import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { routes } from "@/lib/routes";
import type { Json } from "@/lib/supabase/types";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { DashboardButton } from "@/features/dashboard/presentation/components/ui/dashboard-button";
import { DashboardForm } from "@/features/dashboard/presentation/components/ui/dashboard-form";
import { DashboardPageHeader } from "@/features/dashboard/presentation/components/ui/dashboard-page-header";
import { DashboardField, DashboardInput, DashboardTextarea, FieldGroup } from "@/features/dashboard/presentation/components/ui/dashboard-ui";
import { ImageUrlField } from "@/features/dashboard/presentation/components/ui/image-url-field";
import { SeoFieldset } from "@/features/dashboard/presentation/components/ui/seo-fieldset";
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
  return { title: isPageKey(key) ? `Edit: ${getPageDefinition(key).label}` : "Pages" };
}

/** "Edited. Empty it to go back to “Now showing”." */
function editedNote(original: string): string {
  const flat = original.replace(/\n+/g, " / ");
  return `Edited. Empty it to go back to “${flat.length > 90 ? `${flat.slice(0, 88).trimEnd()}…` : flat}”.`;
}

/** A copy field, pre-filled with what the page shows now: the saved words or the default. */
function CopyField({ field, content, studio }: { field: PageField; content: Record<string, Json>; studio: StudioNames }) {
  const original = fieldDefault(field, studio);
  const saved = savedText(content, field.name);
  const shared = { name: `content.${field.name}`, maxLength: fieldMax(field), defaultValue: saved || original, placeholder: original || field.label };
  return (
    <DashboardField
      label={field.label}
      help={field.hint}
      hint={saved && original ? editedNote(original) : undefined}
      className={`${field.half ? "" : "md:col-span-2"} ${field.newRow ? "md:col-start-1" : ""}`}
    >
      {field.kind === "textarea" ? (
        <DashboardTextarea {...shared} rows={field.rows ?? 3} />
      ) : (
        <DashboardInput {...shared} lang={field.kind === "ne" ? "ne" : undefined} />
      )}
    </DashboardField>
  );
}

export default async function EditPageWordsPage({ params }: PageProps) {
  const { key } = await params;
  if (!isPageKey(key)) notFound();
  const { supabase } = await requireAdmin();
  const page = getPageDefinition(key);
  const [{ data: row, error }, site] = await Promise.all([
    supabase.from("pages").select("key, content, body, seo_title, seo_description, og_image").eq("key", key).maybeSingle(),
    getSiteSettings(),
  ]);
  if (error) throw new Error(`Couldn't load the page: ${error.message}`);
  const content = row?.content ?? {};

  // The fields' groups, in order.
  const groups = new Map<string, PageField[]>();
  for (const field of page.fields) groups.set(field.group, [...(groups.get(field.group) ?? []), field]);
  const hasCopy = page.fields.length > 0 || Boolean(page.body);
  const savedBody = row?.body.trim() ? row.body : "";
  const seoDefaults = { seo_title: row?.seo_title ?? "", seo_description: row?.seo_description ?? "", og_image: row?.og_image ?? null };

  return (
    <div className="grid gap-8">
      <DashboardPageHeader
        eyebrow="Pages"
        title={`Edit: ${page.label}`}
        description={
          hasCopy
            ? `${page.summary} on ${page.path}. Each field shows what the page says now: change the words and save, or empty a field to go back to the original wording.`
            : `How ${page.path} shows in Google and in link previews.`
        }
      />

      <DashboardForm action={savePage} submitLabel="Save page">
        <input type="hidden" name="key" value={key} />

        {page.note ? <p className="rounded-card border border-primary/35 bg-primary-soft px-3 py-2 text-xs leading-6 text-muted">{page.note}</p> : null}

        {[...groups].map(([title, fields]) => (
          <FieldGroup key={title} title={title}>
            <div className="grid gap-5 md:grid-cols-2">
              {fields.map((field) => (
                <CopyField key={field.name} field={field} content={content} studio={site} />
              ))}
            </div>
          </FieldGroup>
        ))}

        {page.body ? (
          <FieldGroup title={page.body.label}>
            <DashboardField label="Paragraphs" help={page.body.hint} hint={savedBody ? "Edited. Empty it to go back to the original wording." : undefined}>
              <DashboardTextarea name="body" rows={page.body.rows} maxLength={page.body.max} defaultValue={savedBody || fieldDefault(page.body, site)} />
            </DashboardField>
          </FieldGroup>
        ) : null}

        {page.seo && hasCopy ? (
          <SeoFieldset defaults={seoDefaults} collection="pages" titlePlaceholder={page.seo.title} descriptionPlaceholder={page.seo.description} />
        ) : null}

        {page.seo && !hasCopy ? (
          // A page with nothing else to edit: its search settings open, not folded away.
          <FieldGroup title="SEO & social" description="Leave a field blank to use the page's own title, description and the site's default share image, shown in grey.">
            <DashboardField label="SEO title" help="The title Google and the browser tab show." hint="Best at 50–60 characters.">
              <DashboardInput name="seo_title" defaultValue={seoDefaults.seo_title} maxLength={SEO_TITLE_MAX} placeholder={page.seo.title} />
            </DashboardField>
            <DashboardField label="SEO description" help="The short text under the title in Google results." hint="Best at about 150 characters.">
              <DashboardTextarea name="seo_description" rows={3} defaultValue={seoDefaults.seo_description} maxLength={SEO_DESCRIPTION_MAX} placeholder={page.seo.description} />
            </DashboardField>
            <ImageUrlField
              name="og_image"
              label="Share image"
              collection="pages"
              defaultValue={seoDefaults.og_image}
              help="The picture shown when this page is shared on WhatsApp or Facebook. Blank uses the site's default share image."
              hint="Any photo works: a 1200 × 630 share version is made from it."
            />
          </FieldGroup>
        ) : null}

        {!page.seo ? (
          <div className="flex flex-col gap-3 rounded-card border border-line-strong bg-raised p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-muted">
              This page&apos;s search title is the home title in Settings (Search &amp; social); its description is the studio&apos;s description and its share image the
              site&apos;s default one.
            </p>
            <DashboardButton href={routes.dashboardSection("settings")} className="shrink-0">
              Open settings
            </DashboardButton>
          </div>
        ) : null}
      </DashboardForm>
    </div>
  );
}
