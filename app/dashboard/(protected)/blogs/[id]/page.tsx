import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { routes } from "@/lib/routes";
import { deletePost } from "@/features/blog/presentation/actions/posts";
import { PostForm } from "@/features/blog/presentation/components/post-form";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { ConfirmSubmit } from "@/features/dashboard/presentation/components/form-controls";
import { PageHeader, Panel, rowLinkClass } from "@/features/dashboard/presentation/components/ui";

export const metadata: Metadata = { title: "Edit post" };

type PageProps = { params: Promise<{ id: string }> };

export default async function EditPostPage({ params }: PageProps) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const { data: post } = await supabase.from("posts").select("*").eq("id", id).maybeSingle();
  if (!post) notFound();

  return (
    <>
      <PageHeader
        eyebrow="Blogs"
        title={post.title}
        description={`${post.status === "published" ? "Published" : "Draft"} · about ${post.reading_minutes} min read`}
        actions={
          <div className="flex flex-wrap items-center gap-4">
            <a href={routes.dashboardSection("blogs")} className={rowLinkClass}>
              ← All posts
            </a>
            <Link href={`${routes.dashboardItem("blogs", post.id)}/preview`} className={rowLinkClass}>
              Preview
            </Link>
            {post.status === "published" && (
              <a href={routes.post(post.slug)} target="_blank" rel="noopener noreferrer" className={rowLinkClass}>
                View on the site <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </a>
            )}
          </div>
        }
      />
      <Panel>
        <PostForm post={post} />
      </Panel>
      <Panel title="Delete this post" description="Setting it back to Draft hides it and is reversible. Deleting removes it; a published post's address then sends visitors to the blog." className="mt-6">
        <form action={deletePost}>
          <input type="hidden" name="id" value={post.id} />
          <ConfirmSubmit confirm={`Delete “${post.title}”? This can't be undone.`}>Delete post</ConfirmSubmit>
        </form>
      </Panel>
    </>
  );
}
