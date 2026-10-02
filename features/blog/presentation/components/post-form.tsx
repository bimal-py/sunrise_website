import type { PostRow } from "@/lib/supabase/types";
import { savePost } from "@/features/blog/presentation/actions/posts";
import { ActionForm } from "@/features/dashboard/presentation/components/action-form";
import { ImageField } from "@/features/dashboard/presentation/components/image-field";
import { MdxField } from "@/features/dashboard/presentation/components/mdx-field";
import { Checkbox, Field, inputClass, selectClass, textareaClass } from "@/features/dashboard/presentation/components/ui";

export type PostDraft = Omit<PostRow, "id" | "created_at" | "updated_at" | "reading_minutes" | "headings"> & { id: string };

export function PostForm({ post }: { post: PostDraft }) {
  return (
    <ActionForm action={savePost} submitLabel={post.id ? "Save" : "Create post"}>
      <input type="hidden" name="id" value={post.id} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Title" htmlFor="title" className="sm:col-span-2">
          <input id="title" name="title" required maxLength={200} defaultValue={post.title} className={inputClass} />
        </Field>
        <Field label="Summary" htmlFor="summary" hint="One or two sentences: the card, search results and link previews." className="sm:col-span-2">
          <textarea id="summary" name="summary" rows={2} maxLength={400} defaultValue={post.summary} className={textareaClass} />
        </Field>
        <Field label="Status" htmlFor="status">
          <select id="status" name="status" defaultValue={post.status} className={selectClass}>
            <option value="draft">Draft (not on the site)</option>
            <option value="published">Published</option>
          </select>
        </Field>
        <Field label="Address" htmlFor="slug" hint={post.slug ? `/blogs/${post.slug}. Changing a published post's address adds a redirect.` : "Leave empty to make one from the title."}>
          <input id="slug" name="slug" defaultValue={post.slug} className={inputClass} />
        </Field>
        <Field label="Published on" htmlFor="published_at" hint="Empty = today, when you publish.">
          <input id="published_at" name="published_at" type="date" defaultValue={post.published_at ?? ""} className={inputClass} />
        </Field>
        <Field label="Updated on" htmlFor="updated_on" hint="Only when the content really changed (shows “Updated”).">
          <input id="updated_on" name="updated_on" type="date" defaultValue={post.updated_on ?? ""} className={inputClass} />
        </Field>
        <Field label="Topics" htmlFor="tags" hint="Comma separated, in English, e.g. Weddings, Planning.">
          <input id="tags" name="tags" defaultValue={post.tags.join(", ")} className={inputClass} />
        </Field>
        <Field label="Author" htmlFor="author" hint="Empty = the studio's name.">
          <input id="author" name="author" defaultValue={post.author} className={inputClass} />
        </Field>
        <Field label="Language" htmlFor="language">
          <select id="language" name="language" defaultValue={post.language} className={selectClass}>
            <option value="en">English</option>
            <option value="ne">Nepali</option>
          </select>
        </Field>
        <div className="flex items-end">
          <Checkbox name="featured" label="Featured" defaultChecked={post.featured} hint="Comes first among posts of the same date." />
        </div>
      </div>

      <MdxField name="body" label="Post" defaultValue={post.body} />

      <div className="grid gap-5 rounded-card border border-line p-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <ImageField name="cover" label="Cover photo" collection="blog" defaultValue={post.cover} hint="The studio's own photos only (a still from a film works well). Landscape." />
        </div>
        <Field label="Cover description (alt text)" htmlFor="cover_alt" hint="What's in the photo, for people who can't see it." className="sm:col-span-2">
          <input id="cover_alt" name="cover_alt" maxLength={300} defaultValue={post.cover_alt} className={inputClass} />
        </Field>
        <Field label="Credit" htmlFor="cover_credit" hint="e.g. Sunrise Photo Studio, from the film Basanta weds Bindu">
          <input id="cover_credit" name="cover_credit" defaultValue={post.cover_credit} className={inputClass} />
        </Field>
        <Field label="Credit link" htmlFor="cover_credit_url" hint="e.g. the film on YouTube.">
          <input id="cover_credit_url" name="cover_credit_url" type="url" defaultValue={post.cover_credit_url} className={inputClass} />
        </Field>
        <Field label="Licence (photos that aren't the studio's)" htmlFor="cover_license">
          <input id="cover_license" name="cover_license" defaultValue={post.cover_license} className={inputClass} />
        </Field>
        <Field label="Licence link" htmlFor="cover_license_url">
          <input id="cover_license_url" name="cover_license_url" type="url" defaultValue={post.cover_license_url} className={inputClass} />
        </Field>
      </div>

      <details className="rounded-card border border-line p-4">
        <summary className="cursor-pointer text-sm font-medium text-strong">Search engines (optional)</summary>
        <div className="mt-4 grid gap-5">
          <Field label="Search title" htmlFor="seo_title" hint="Empty = the title. About 50–60 characters.">
            <input id="seo_title" name="seo_title" maxLength={120} defaultValue={post.seo_title} className={inputClass} />
          </Field>
          <Field label="Search description" htmlFor="seo_description" hint="Empty = the summary. About 150 characters.">
            <textarea id="seo_description" name="seo_description" rows={2} maxLength={300} defaultValue={post.seo_description} className={textareaClass} />
          </Field>
        </div>
      </details>
    </ActionForm>
  );
}
