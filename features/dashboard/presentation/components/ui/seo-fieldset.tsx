import type { MediaCollection } from "@/lib/media/process-image";
import type { ImageAsset } from "@/shared/domain/image";
import { SEO_DESCRIPTION_MAX, SEO_TITLE_MAX } from "@/features/site/domain/page-content";
import { DashboardField, DashboardInput, DashboardTextarea, fieldLabelClass } from "./dashboard-ui";
import { ImageUrlField } from "./image-url-field";

/**
 * The portfolio's "SEO & social (optional)" block: closed by default, at the bottom of an
 * editor just above the save button. Blank fields fall back to the item's own title, summary
 * and photo. Sends `seo_title`, `seo_description` and `og_image` (the share photo's JSON).
 */
export function SeoFieldset({
  defaults,
  collection,
  titlePlaceholder,
  descriptionPlaceholder,
}: {
  defaults: { seo_title?: string | null; seo_description?: string | null; og_image?: ImageAsset | null };
  /** The photo folder a newly picked share image is made in. */
  collection: MediaCollection;
  /** What's used when the field is blank, shown greyed inside it. */
  titlePlaceholder?: string;
  descriptionPlaceholder?: string;
}) {
  return (
    <details className="min-w-0 rounded-card border border-line-strong bg-raised px-4 py-3">
      <summary className={`cursor-pointer select-none py-1 ${fieldLabelClass}`}>SEO &amp; social (optional)</summary>
      <div className="mt-4 grid gap-5 pb-1">
        <p className="text-xs leading-5 text-muted">Leave any field blank to use the automatic value.</p>
        <DashboardField
          label="SEO title"
          help="The title Google and the browser tab show. Blank uses the title above."
          example="Wedding photography in Syangja"
          hint="Best at 50–60 characters."
        >
          <DashboardInput
            name="seo_title"
            defaultValue={defaults.seo_title ?? ""}
            placeholder={titlePlaceholder || "SEO title (optional)"}
            maxLength={SEO_TITLE_MAX}
          />
        </DashboardField>
        <DashboardField
          label="SEO description"
          help="The short text under the title in Google results. Blank uses the summary."
          example="Wedding photos and films by Sunrise Photo Studio in Syangja."
          hint="Best at about 150 characters."
        >
          <DashboardTextarea
            name="seo_description"
            rows={2}
            defaultValue={defaults.seo_description ?? ""}
            placeholder={descriptionPlaceholder || "SEO description (optional)"}
            maxLength={SEO_DESCRIPTION_MAX}
          />
        </DashboardField>
        <ImageUrlField
          name="og_image"
          label="Share image"
          collection={collection}
          defaultValue={defaults.og_image ?? null}
          help="The picture shown when this page is shared on WhatsApp or Facebook. Blank uses the page's own photo, then the site's default."
          hint="Any photo works: a 1200 × 630 share version is made from it."
        />
      </div>
    </details>
  );
}
