import type { ProductCategoryRow } from "@/lib/supabase/types";
import { routes } from "@/lib/routes";
import { SEO_DESCRIPTION_MAX, SEO_TITLE_MAX } from "@/features/site/domain/page-content";
import { DashboardForm } from "@/features/dashboard/presentation/components/ui/dashboard-form";
import {
  DashboardCheckbox,
  DashboardField,
  DashboardInput,
  DashboardTextarea,
  fieldLabelClass,
} from "@/features/dashboard/presentation/components/ui/dashboard-ui";
import { ImageUrlField } from "@/features/dashboard/presentation/components/ui/image-url-field";
import { saveCategory } from "../actions/categories";

/**
 * The category editor: name, Nepali name, slug, description, photo, published and sort
 * order, then "SEO & social" (title and description; categories have no share image of their
 * own). Saving goes back to the categories list.
 */
export function CategoryForm({ category, defaultSortOrder }: { category: ProductCategoryRow | null; defaultSortOrder: number }) {
  const c = category;
  return (
    <DashboardForm action={saveCategory} submitLabel={c ? "Save category" : "Create category"} pendingLabel={c ? "Saving…" : "Creating…"}>
      {c ? <input type="hidden" name="id" value={c.id} /> : null}

      <div className="grid gap-5 md:grid-cols-2">
        <DashboardField label="Name" required help="Shown as a filter in the shop and on the product pages in it." example="Photo frames">
          <DashboardInput name="name" defaultValue={c?.name ?? ""} maxLength={120} placeholder="Name" />
        </DashboardField>
        <DashboardField label="Name in Nepali" help="The name in Nepali, for where the shop shows Nepali. Leave blank if it isn't needed." example="फोटो फ्रेम">
          <DashboardInput name="name_ne" lang="ne" defaultValue={c?.name_ne ?? ""} maxLength={120} placeholder="Name in Nepali (optional)" />
        </DashboardField>
      </div>

      <DashboardField
        label="Slug"
        help="Used in the shop's filter link: lowercase words joined by hyphens. Leave blank to make one from the name."
        example="photo-frames"
        hint={c ? `Now ${routes.merchandiseCategory(c.slug)}` : "Blank: made from the name."}
      >
        <DashboardInput name="slug" defaultValue={c?.slug ?? ""} maxLength={120} placeholder="Slug (optional)" spellCheck={false} autoCapitalize="off" autoComplete="off" className="font-mono" />
      </DashboardField>

      <DashboardField label="Description" help="A sentence or two about what's in it. Optional." example="Frames for prints from 5×7 to 20×30 in.">
        <DashboardTextarea name="description" rows={3} maxLength={1000} defaultValue={c?.description ?? ""} placeholder="Description (optional)" />
      </DashboardField>

      <ImageUrlField name="image" label="Photo" collection="products" defaultValue={c?.image ?? null} help="An optional photo for the category: choose one from the library, upload one, or paste a link." />

      <div className="grid items-end gap-x-5 gap-y-2 md:grid-cols-2">
        <DashboardCheckbox
          name="published"
          label="Published"
          defaultChecked={c?.published ?? true}
          hint="Shown in the shop once a published product is in it. Unticked: hidden, and its products show without a category."
        />
        <DashboardField label="Sort order" help="Lower numbers come first in the shop's filter. The arrows on the categories list set it for you." example="10">
          <DashboardInput name="sort_order" type="number" inputMode="numeric" step={1} defaultValue={c?.sort_order ?? defaultSortOrder} />
        </DashboardField>
      </div>

      <details className="min-w-0 rounded-card border border-line-strong bg-raised px-4 py-3">
        <summary className={`cursor-pointer select-none py-1 ${fieldLabelClass}`}>SEO &amp; social (optional)</summary>
        <div className="mt-4 grid gap-5 pb-1">
          <p className="text-xs leading-5 text-muted">Leave a field blank to use the name and description.</p>
          <DashboardField label="SEO title" help="A title for search engines, if the category is listed on its own. Blank uses the name." example="Photo frames in Syangja" hint="Best at 50–60 characters.">
            <DashboardInput name="seo_title" defaultValue={c?.seo_title ?? ""} maxLength={SEO_TITLE_MAX} placeholder={c?.name || "SEO title (optional)"} />
          </DashboardField>
          <DashboardField label="SEO description" help="A short text for search results. Blank uses the description." hint="Best at about 150 characters.">
            <DashboardTextarea
              name="seo_description"
              rows={2}
              defaultValue={c?.seo_description ?? ""}
              maxLength={SEO_DESCRIPTION_MAX}
              placeholder={c?.description || "SEO description (optional)"}
            />
          </DashboardField>
        </div>
      </details>
    </DashboardForm>
  );
}
