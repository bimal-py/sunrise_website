import type { ImageAsset } from "@/shared/domain/image";
import type { ContentSection, Faq, OfferingIcon } from "@/shared/domain/offering";
import { IconPicker } from "./icon-picker";
import { ImageField } from "./image-field";
import { RepeatableField } from "./repeatable-field";
import { Checkbox, Field, inputClass, textareaClass } from "./ui";

export type OfferingDefaults = {
  name: string;
  name_ne: string;
  slug: string;
  icon: OfferingIcon;
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

/** The editor fields services and prints share. `kind` names the public section (services/prints). */
export function OfferingFields({ d, kind, featuredHint, children }: { d: OfferingDefaults; kind: "services" | "prints"; featuredHint: string; children?: React.ReactNode }) {
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" htmlFor="name">
          <input id="name" name="name" required maxLength={160} defaultValue={d.name} className={inputClass} />
        </Field>
        <Field label="Name in Nepali" htmlFor="name_ne">
          <input id="name_ne" name="name_ne" lang="ne" defaultValue={d.name_ne} className={inputClass} />
        </Field>
        <Field label="Address" htmlFor="slug" hint={d.slug ? `/${kind}/${d.slug}. Changing it adds a redirect from the old address.` : "Leave empty to make one from the name."}>
          <input id="slug" name="slug" defaultValue={d.slug} className={inputClass} />
        </Field>
        <Field label="Kind of service (for search engines)" htmlFor="service_type" hint="e.g. Wedding photography, Canvas printing.">
          <input id="service_type" name="service_type" defaultValue={d.service_type} className={inputClass} />
        </Field>
        <div className="sm:col-span-2">
          <IconPicker name="icon" defaultValue={d.icon} />
        </div>
        <Field label="Summary" htmlFor="summary" hint="One sentence: cards, search results and link previews." className="sm:col-span-2">
          <textarea id="summary" name="summary" rows={2} required maxLength={400} defaultValue={d.summary} className={textareaClass} />
        </Field>
        <Field label="Opening paragraphs" htmlFor="intro" hint="Leave a blank line between paragraphs." className="sm:col-span-2">
          <textarea id="intro" name="intro" rows={6} defaultValue={d.intro.join("\n\n")} className={textareaClass} />
        </Field>
      </div>

      {children}

      <RepeatableField
        name="sections"
        label="Sections"
        hint="Each becomes a heading on the page with a paragraph, a list (one item per line), or both."
        columns={[
          { key: "heading", label: "Heading" },
          { key: "body", label: "Paragraph", kind: "textarea" },
          { key: "items", label: "List", kind: "lines", hint: "one item per line" },
        ]}
        defaultValue={d.sections}
        addLabel="Add a section"
      />
      <RepeatableField
        name="faqs"
        label="Questions"
        columns={[
          { key: "question", label: "Question" },
          { key: "answer", label: "Answer", kind: "textarea" },
        ]}
        defaultValue={d.faqs}
        addLabel="Add a question"
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="WhatsApp message" htmlFor="inquiry" hint="Pre-filled when a client taps “Ask on WhatsApp”. End with “Our date is: ” to let them finish it." className="sm:col-span-2">
          <textarea id="inquiry" name="inquiry" rows={2} defaultValue={d.inquiry} className={textareaClass} />
        </Field>
        <Field label="Order" htmlFor="sort_order" hint="Lower numbers come first.">
          <input id="sort_order" name="sort_order" type="number" defaultValue={d.sort_order} className={inputClass} />
        </Field>
        <div className="flex flex-col gap-1">
          <Checkbox name="published" label="Published" defaultChecked={d.published} hint="Unticked = hidden from the site." />
          <Checkbox name="featured" label="Featured" defaultChecked={d.featured} hint={featuredHint} />
        </div>
      </div>

      <details className="rounded-card border border-line p-4">
        <summary className="cursor-pointer text-sm font-medium text-strong">Search engines and sharing (optional)</summary>
        <div className="mt-4 grid gap-5">
          <Field label="Search title" htmlFor="seo_title" hint="Empty = “Name in Syangja”. About 50–60 characters.">
            <input id="seo_title" name="seo_title" maxLength={120} defaultValue={d.seo_title} className={inputClass} />
          </Field>
          <Field label="Search description" htmlFor="seo_description" hint="Empty = the summary. About 150 characters.">
            <textarea id="seo_description" name="seo_description" rows={2} maxLength={300} defaultValue={d.seo_description} className={textareaClass} />
          </Field>
          <ImageField name="og_image" label="Share image" collection="offerings" defaultValue={d.og_image} hint="Shown when the page is shared on WhatsApp or Facebook. Landscape." />
        </div>
      </details>
    </>
  );
}
