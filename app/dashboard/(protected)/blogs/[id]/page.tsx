import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { DashboardPageHeader } from "@/features/dashboard/presentation/components/ui/dashboard-page-header";
import { PostForm } from "@/features/blog/presentation/components/post-form";

export const metadata: Metadata = { title: "Edit blog" };

type PageProps = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditPostPage({ params }: PageProps) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const { data: post, error } = await supabase
    .from("posts")
    .select(
      "id, slug, title, summary, body, status, published_at, updated_on, author, tags, language, featured, cover, cover_alt, cover_credit, cover_credit_url, cover_license, cover_license_url, reading_minutes, seo_title, seo_description",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Couldn't load the post: ${error.message}`);
  if (!post) notFound();

  return (
    <div className="grid gap-8">
      <DashboardPageHeader
        eyebrow="Blogs"
        title={`Edit: ${post.title}`}
        description="Update the text, cover and publishing details here. Saving takes you back to the list; Preview there shows how the post reads."
      />
      <PostForm post={post} mode="edit" />
    </div>
  );
}
