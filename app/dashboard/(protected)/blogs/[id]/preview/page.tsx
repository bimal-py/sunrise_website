import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { compileSafeMdx, mdxErrorDetail } from "@/lib/mdx/compile";
import { routes } from "@/lib/routes";
import { formatDate } from "@/lib/utils/date";
import { mdxComponents } from "@/features/blog/presentation/components/mdx-components";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { DashboardButton } from "@/features/dashboard/presentation/components/ui/dashboard-button";
import { DashboardPageHeader } from "@/features/dashboard/presentation/components/ui/dashboard-page-header";
import { DashboardNotice, StatusBadge } from "@/features/dashboard/presentation/components/ui/dashboard-ui";

export const metadata: Metadata = { title: "Preview blog" };

type PageProps = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The saved post as the article will read (drafts included), visible only in the dashboard. */
export default async function PreviewPostPage({ params }: PageProps) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const { data: post, error } = await supabase
    .from("posts")
    .select("id, slug, title, summary, body, status, published_at, reading_minutes, language, cover, cover_alt")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Couldn't load the post: ${error.message}`);
  if (!post) notFound();

  let content: ReactNode = null;
  let problem: string | null = null;
  try {
    content = (await compileSafeMdx(post.body, { components: mdxComponents, slugs: true })).content;
  } catch (compileError) {
    problem = mdxErrorDetail(compileError);
  }
  const live = post.status === "published";

  return (
    <div className="grid gap-8">
      <DashboardPageHeader
        eyebrow="Preview"
        title={post.title}
        description={post.summary || "No summary yet."}
        actions={
          <>
            <DashboardButton href={routes.dashboardItem("blogs", post.id)}>Edit</DashboardButton>
            {live ? (
              <DashboardButton href={routes.post(post.slug)} newTab>
                View on the site ↗
              </DashboardButton>
            ) : null}
          </>
        }
      />
      <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
        <StatusBadge status={live ? "Published" : "Draft"} />
        <span>{post.reading_minutes} min read</span>
        {post.published_at ? <span>{formatDate(post.published_at)}</span> : null}
      </div>
      {problem !== null ? (
        <DashboardNotice tone="error">The post text has a formatting problem{problem ? `: ${problem.replace(/\.$/, "")}` : ""}. Fix it in the editor before publishing.</DashboardNotice>
      ) : null}
      {post.cover ? (
        <Image
          src={post.cover.src}
          alt={post.cover_alt}
          width={post.cover.width}
          height={post.cover.height}
          sizes="(min-width: 1280px) 1200px, 100vw"
          placeholder={post.cover.blurDataURL ? "blur" : "empty"}
          blurDataURL={post.cover.blurDataURL || undefined}
          className="w-full rounded-panel"
        />
      ) : null}
      {content ? (
        <article lang={post.language === "ne" ? "ne" : undefined} className="prose-article min-w-0 max-w-3xl rounded-panel border border-line bg-surface p-6 sm:p-10">
          {content}
        </article>
      ) : null}
    </div>
  );
}
