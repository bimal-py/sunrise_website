import type { PostRow } from "@/lib/supabase/types";
import { routes } from "@/lib/routes";
import { readingTime } from "@/features/blog/data/blog.utils";
import { savePost } from "@/features/blog/presentation/actions/posts";
import { MdxField } from "@/features/dashboard/presentation/components/mdx-field";
import { DashboardForm } from "@/features/dashboard/presentation/components/ui/dashboard-form";
import {
  DashboardCheckbox,
  DashboardField,
  DashboardInput,
  DashboardSelect,
  DashboardTextarea,
  fieldLabelClass,
} from "@/features/dashboard/presentation/components/ui/dashboard-ui";
import { ImageUrlField } from "@/features/dashboard/presentation/components/ui/image-url-field";

export type PostValues = Pick<
  PostRow,
  | "id"
  | "slug"
  | "title"
  | "summary"
  | "body"
  | "status"
  | "published_at"
  | "updated_on"
  | "author"
  | "tags"
  | "language"
  | "featured"
  | "cover"
  | "cover_alt"
  | "cover_credit"
  | "cover_credit_url"
  | "cover_license"
  | "cover_license_url"
  | "reading_minutes"
  | "seo_title"
  | "seo_description"
>;

/** An empty post with the id the New page made for it. */
export function blankPost(id: string): PostValues {
  return {
    id,
    slug: "",
    title: "",
    summary: "",
    body: "",
    status: "draft",
    published_at: null,
    updated_on: null,
    author: "",
    tags: [],
    language: "en",
    featured: false,
    cover: null,
    cover_alt: "",
    cover_credit: "",
    cover_credit_url: "",
    cover_license: "",
    cover_license_url: "",
    reading_minutes: 1,
    seo_title: "",
    seo_description: "",
  };
}

/**
 * The blog editor, laid out like the portfolio's: title and slug, summary, the text, then
 * the cover, reading time and status, the details, and "SEO & social" last. Saving goes back
 * to the list. Posts have no separate share image: shared links use the cover photo.
 */
export function PostForm({ post, mode }: { post: PostValues; mode: "create" | "edit" }) {
  const auto = readingTime(post.body);
  // A reading time that differs from the text's own count was typed in; otherwise the field stays blank (automatic).
  const minutes = mode === "edit" && post.body.trim() && post.reading_minutes !== auto ? String(post.reading_minutes) : "";
  const creating = mode === "create";

  return (
    <DashboardForm action={savePost} submitLabel={creating ? "Create blog" : "Save blog"} pendingLabel={creating ? "Creating…" : "Saving…"}>
      <input type="hidden" name="id" value={post.id} />

      <div className="grid gap-5 md:grid-cols-2">
        <DashboardField label="Title" required help="Shown on the blog card and as the post's heading." example="How to plan your wedding photos">
          <DashboardInput name="title" defaultValue={post.title} maxLength={200} placeholder="Title" />
        </DashboardField>
        <DashboardField
          label="Slug"
          help="The post's address: lowercase words joined by hyphens. Leave blank to make one from the title. Changing a published post's address adds a redirect from the old one."
          example="plan-your-wedding-photos"
          hint={post.slug ? `Now ${routes.post(post.slug)}` : undefined}
        >
          <DashboardInput name="slug" defaultValue={post.slug} maxLength={120} placeholder="Slug (optional)" spellCheck={false} autoCapitalize="off" autoComplete="off" className="font-mono" />
        </DashboardField>
      </div>

      <DashboardField label="Summary" required help="One or two sentences for the blog card, Google and link previews. Needed before publishing.">
        <DashboardTextarea name="summary" rows={3} maxLength={400} defaultValue={post.summary} placeholder="Summary" />
      </DashboardField>

      <MdxField
        name="body"
        label="Post"
        required
        defaultValue={post.body}
        help="The article in Markdown: ## for a heading, **bold**, [text](/page) for a link, <Ne>…</Ne> around Nepali words. “On this page” is built from the ## and ### headings."
      />

      <div className="grid gap-5 md:grid-cols-3">
        <ImageUrlField
          name="cover"
          label="Cover photo"
          collection="blog"
          defaultValue={post.cover}
          help="The photo at the top of the post and on its card, and the picture shown when the post is shared. The studio's own photos only (a still from a film works well); landscape."
        />
        <DashboardField
          label="Reading time"
          help="Minutes to read, shown on the card and under the title. Leave blank to work it out from the text when you save."
          example="5"
          hint="Minutes. Blank: counted from the text."
        >
          <DashboardInput name="reading_minutes" type="number" inputMode="numeric" min={1} max={240} step={1} defaultValue={minutes} placeholder={`Auto: ${auto} min`} />
        </DashboardField>
        <DashboardField label="Status" required help="Draft keeps the post private; Published puts it on the site (and in the sitemap).">
          <DashboardSelect name="status" defaultValue={post.status}>
            <option value="draft">Draft (not on the site)</option>
            <option value="published">Published</option>
          </DashboardSelect>
        </DashboardField>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <DashboardField label="Language" help="The language the post is written in. A Nepali post is marked as Nepali for browsers and search engines.">
          <DashboardSelect name="language" defaultValue={post.language}>
            <option value="en">English</option>
            <option value="ne">Nepali</option>
          </DashboardSelect>
        </DashboardField>
        <DashboardField label="Author" help="Shown under the title. Leave blank to use the studio's name." example="Sunrise Photo Studio">
          <DashboardInput name="author" defaultValue={post.author} maxLength={120} placeholder="Author (optional)" />
        </DashboardField>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <DashboardField label="Published date" help="The date shown on the post. Leave blank to use today's date when you publish.">
          <DashboardInput name="published_at" type="date" defaultValue={post.published_at ?? ""} />
        </DashboardField>
        <DashboardField label="Updated on" help="Only when the content really changed: the post then shows “Updated” with this date. Leave blank otherwise.">
          <DashboardInput name="updated_on" type="date" defaultValue={post.updated_on ?? ""} />
        </DashboardField>
      </div>

      <DashboardField label="Topics" help="Comma separated, in English. Each topic gets its own filter on the blog (up to 8)." example="Weddings, Planning">
        <DashboardInput name="tags" defaultValue={post.tags.join(", ")} maxLength={400} placeholder="Topics (comma separated)" />
      </DashboardField>

      <div className="grid gap-5 md:grid-cols-3">
        <DashboardField label="Cover description" help="What's in the cover photo, for people who can't see it and for search engines. Needed when there's a cover." example="The bride's family during the sindoor ritual">
          <DashboardInput name="cover_alt" defaultValue={post.cover_alt} maxLength={300} placeholder="Alt text" />
        </DashboardField>
        <DashboardField label="Cover credit" help="Shown under the cover photo." example="Sunrise Photo Studio, from the film Basanta weds Bindu">
          <DashboardInput name="cover_credit" defaultValue={post.cover_credit} maxLength={200} placeholder="Credit (optional)" />
        </DashboardField>
        <DashboardField label="Credit link" help="Where the credit links to: the film on YouTube, or a page on this site (/films/…)." example="https://www.youtube.com/watch?v=…">
          <DashboardInput name="cover_credit_url" type="text" inputMode="url" defaultValue={post.cover_credit_url} maxLength={500} placeholder="https://…" spellCheck={false} autoCapitalize="off" />
        </DashboardField>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <DashboardField label="Licence" help="Only for a cover photo that isn't the studio's own: the licence it's used under." example="CC BY 4.0">
          <DashboardInput name="cover_license" defaultValue={post.cover_license} maxLength={120} placeholder="Licence (optional)" />
        </DashboardField>
        <DashboardField label="Licence link" help="The licence's page." example="https://creativecommons.org/licenses/by/4.0/">
          <DashboardInput name="cover_license_url" type="text" inputMode="url" defaultValue={post.cover_license_url} maxLength={500} placeholder="https://…" spellCheck={false} autoCapitalize="off" />
        </DashboardField>
      </div>

      <DashboardCheckbox name="featured" label="Featured" defaultChecked={post.featured} hint="Comes first among posts of the same date." />

      <details className="min-w-0 rounded-card border border-line-strong bg-raised px-4 py-3">
        <summary className={`cursor-pointer select-none py-1 ${fieldLabelClass}`}>SEO &amp; social (optional)</summary>
        <div className="mt-4 grid gap-5 pb-1">
          <p className="text-xs leading-5 text-muted">Leave a field blank to use the title and summary. Shared links show the cover photo.</p>
          <DashboardField label="SEO title" help="The title Google and the browser tab show. Blank uses the title above." example="Planning wedding photos in Syangja" hint="Best at 50–60 characters.">
            <DashboardInput name="seo_title" defaultValue={post.seo_title} maxLength={120} placeholder={post.title || "SEO title (optional)"} />
          </DashboardField>
          <DashboardField label="SEO description" help="The short text under the title in Google results. Blank uses the summary." hint="Best at about 150 characters.">
            <DashboardTextarea name="seo_description" rows={2} defaultValue={post.seo_description} maxLength={300} placeholder={post.summary || "SEO description (optional)"} />
          </DashboardField>
        </div>
      </details>
    </DashboardForm>
  );
}
