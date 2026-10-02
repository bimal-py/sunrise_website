import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { compileMDX } from "next-mdx-remote/rsc";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { routes } from "@/lib/routes";
import { formatDate } from "@/lib/utils/date";
import { mdxComponents } from "@/features/blog/presentation/components/mdx-components";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { PageHeader, rowLinkClass, StatusBadge } from "@/features/dashboard/presentation/components/ui";

export const metadata: Metadata = { title: "Preview post" };

type PageProps = { params: Promise<{ id: string }> };

/** The saved post as the article will read (drafts included), visible only in the dashboard. */
export default async function PreviewPostPage({ params }: PageProps) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const { data: post } = await supabase.from("posts").select("*").eq("id", id).maybeSingle();
  if (!post) notFound();

  let content: React.ReactNode;
  try {
    content = (await compileMDX({ source: post.body, components: mdxComponents, options: { mdxOptions: { remarkPlugins: [remarkGfm], rehypePlugins: [rehypeSlug] } } })).content;
  } catch (error) {
    content = <p className="text-error">The post text has a formatting problem: {error instanceof Error ? error.message : "unknown"}</p>;
  }

  return (
    <>
      <PageHeader
        eyebrow="Preview"
        title={post.title}
        description={post.summary}
        actions={
          <a href={routes.dashboardItem("blogs", post.id)} className={rowLinkClass}>
            ← Back to editing
          </a>
        }
      />
      <div className="mb-6 flex flex-wrap items-center gap-3 font-mono text-xs uppercase tracking-[0.14em] text-muted">
        {post.status === "published" ? <StatusBadge tone="green">Published</StatusBadge> : <StatusBadge>Draft</StatusBadge>}
        <span>{post.reading_minutes} min read</span>
        {post.published_at && <span>{formatDate(post.published_at)}</span>}
      </div>
      {post.cover && (
        <Image src={post.cover.src} alt={post.cover_alt} width={post.cover.width} height={post.cover.height} sizes="(min-width: 1024px) 900px, 100vw" placeholder="blur" blurDataURL={post.cover.blurDataURL} className="mb-8 w-full rounded-panel" />
      )}
      <article className="prose-article max-w-3xl rounded-panel border border-line bg-surface p-6 sm:p-10">{content}</article>
    </>
  );
}
