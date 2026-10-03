import type { ReactNode } from "react";
import type { ImageAsset } from "@/shared/domain/image";
import type { ContentSection, Faq, OfferingIcon as IconName } from "@/shared/domain/offering";
import { OfferingIcon } from "@/shared/components/content/offering-icon";
import { RepeatableField } from "./repeatable-field";
import { DashboardCheckbox, DashboardField, DashboardInput, DashboardSelect, DashboardTextarea } from "./ui/dashboard-ui";
import { IconPickerField } from "./ui/icon-picker-field";
import { SeoFieldset } from "./ui/seo-fieldset";

export type OfferingDefaults = {
  name: string;
  name_ne: string;
  slug: string;
  icon: IconName;
  icon_source: string;
  icon_svg: string | null;
  summary: string;
  intro: string[];
  sections: ContentSection[];
  faqs: Faq[];
  inquiry: string;
  service_type: string;
  featured: boolean;
  published: boolean;
  sort_order: number;
  og_image: ImageAsset | null;
  seo_title: string;
  seo_description: string;
};

const COPY = {
  services: {
    name: "Wedding photography",
    nameNe: "विवाह फोटोग्राफी",
    slug: "wedding-photography",
    type: "Wedding photography",
    summary: "Photos of the whole wedding day, from the bride's preparations to the bidaai.",
    inquiry: "Namaste! I'd like to ask about wedding photography. Our date is: ",
  },
  prints: {
    name: "Premium wedding albums",
    nameNe: "विवाह एल्बम",
    slug: "wedding-albums",
    type: "Photo album printing",
    summary: "Albums designed from your wedding photos, to keep and pass on.",
    inquiry: "Namaste! I'd like a quote for a wedding album. ",
  },
} as const;

/**
 * The editor fields services and prints share, in the portfolio's order: name and slug,
 * icon, summary and page text, sections, questions, the WhatsApp message, then the kind's own
 * fields (`children`), then order, status, featured and the SEO block.
 */
export function OfferingFields({ d, kind, featuredHint, children }: { d: OfferingDefaults; kind: "services" | "prints"; featuredHint: string; children?: ReactNode }) {
  const copy = COPY[kind];
  const thing = kind === "services" ? "service" : "print";
  return (
    <>
      <div className="grid gap-5 md:grid-cols-2">
        <DashboardField label="Name" required help="Shown on cards, as the page's main heading and in search results." example={copy.name}>
          <DashboardInput name="name" defaultValue={d.name} maxLength={160} placeholder="Name" />
        </DashboardField>
        <DashboardField label="Name in Nepali" help="Shown under the English name on cards and on its page." example={copy.nameNe}>
          <DashboardInput name="name_ne" lang="ne" defaultValue={d.name_ne} maxLength={160} placeholder="Name in Nepali (optional)" />
        </DashboardField>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <DashboardField
          label="Slug"
          help="The page's address: lowercase words joined by hyphens. Leave blank to make one from the name. Changing it later adds a redirect from the old address."
          example={copy.slug}
          hint={d.slug ? `/${kind}/${d.slug}` : undefined}
        >
          <DashboardInput name="slug" defaultValue={d.slug} maxLength={120} placeholder="Slug (optional)" spellCheck={false} autoCapitalize="none" autoComplete="off" />
        </DashboardField>
        <DashboardField label="Kind of service" help="What search engines file the page under (schema.org serviceType). Blank uses the name." example={copy.type}>
          <DashboardInput name="service_type" defaultValue={d.service_type} maxLength={120} placeholder="Kind of service (optional)" />
        </DashboardField>
      </div>

      <IconPickerField
        label="Icon"
        defaultValue={d.icon_source}
        defaultSvg={d.icon_svg}
        help={`The small gold icon on the ${thing}'s card. Search the icon library, or paste a link to an SVG icon.`}
        example="camera, heart, album"
        hint={
          d.icon_source ? undefined : (
            <span className="inline-flex flex-wrap items-center gap-1.5">
              Now the built-in <OfferingIcon name={d.icon} className="size-4" /> {d.icon} icon. Pick one to replace it, or leave this blank to keep it.
            </span>
          )
        }
      />

      <DashboardField label="Summary" required help="One sentence for cards, search results and link previews." example={copy.summary}>
        <DashboardTextarea name="summary" rows={3} defaultValue={d.summary} maxLength={400} placeholder="Summary" />
      </DashboardField>
      <DashboardField label="Opening paragraphs" help="The first paragraphs of its page, under the heading. Leave a blank line between paragraphs.">
        <DashboardTextarea name="intro" rows={6} defaultValue={d.intro.join("\n\n")} placeholder="Opening paragraphs (optional)" />
      </DashboardField>

      <RepeatableField
        name="sections"
        label="Sections"
        itemLabel="Section"
        help="Each becomes a heading on the page with a paragraph, a list (one item per line), or both. A section needs a heading and some text."
        example="What's included · Two photographers for the whole day…"
        columns={[
          { key: "heading", label: "Heading", maxLength: 160, placeholder: "What's included" },
          { key: "body", label: "Paragraph", kind: "textarea", maxLength: 3000 },
          { key: "items", label: "List", kind: "lines", hint: "one item per line" },
        ]}
        defaultValue={d.sections}
        addLabel="Add a section"
      />
      <RepeatableField
        name="faqs"
        label="Questions"
        itemLabel="Question"
        help="Common questions and their answers, shown at the end of the page (and to search engines). Prices and dates: say “ask us”."
        example="Do you travel outside Syangja? · Yes, ask us about your date and place."
        columns={[
          { key: "question", label: "Question", maxLength: 300 },
          { key: "answer", label: "Answer", kind: "textarea", maxLength: 2000 },
        ]}
        defaultValue={d.faqs}
        addLabel="Add a question"
      />

      <DashboardField
        label="WhatsApp message"
        help="Pre-filled when a client taps “Ask on WhatsApp” on its page. End it with “Our date is: ” to let them finish it."
        example={copy.inquiry}
      >
        <DashboardTextarea name="inquiry" rows={2} defaultValue={d.inquiry} maxLength={600} placeholder="WhatsApp message (optional)" />
      </DashboardField>

      {children}

      <div className="grid gap-5 md:grid-cols-2">
        <DashboardField label="Sort order" help="Lower numbers come first on the site. The arrows on the list change it for you." example="10">
          <DashboardInput name="sort_order" type="number" inputMode="numeric" step={1} defaultValue={d.sort_order} />
        </DashboardField>
        <DashboardField label="Status" required help="Draft keeps it off the site (its page, the lists and the sitemap); Published shows it.">
          <DashboardSelect name="status" defaultValue={d.published ? "published" : "draft"}>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </DashboardSelect>
        </DashboardField>
      </div>
      <DashboardCheckbox name="featured" label="Featured (show on home)" defaultChecked={d.featured} hint={featuredHint} />

      <SeoFieldset
        defaults={{ seo_title: d.seo_title, seo_description: d.seo_description, og_image: d.og_image }}
        collection="offerings"
        titlePlaceholder={d.name ? `${d.name} in Syangja` : undefined}
        descriptionPlaceholder={d.summary || undefined}
      />
    </>
  );
}
