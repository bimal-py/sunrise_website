import type { Metadata } from "next";
import { routes } from "@/lib/routes";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { PageHeader, Panel, rowLinkClass } from "@/features/dashboard/presentation/components/ui";
import { PostForm } from "@/features/blog/presentation/components/post-form";

export const metadata: Metadata = { title: "New post" };

export default async function NewPostPage() {
  await requireAdmin();
  const blank = {
    id: "", slug: "", title: "", summary: "", body: "", status: "draft" as const, published_at: null, updated_on: null, author: "", tags: [], language: "en" as const,
    featured: false, cover: null, cover_alt: "", cover_credit: "", cover_credit_url: "", cover_license: "", cover_license_url: "", seo_title: "", seo_description: "",
  };
  return (
    <>
      <PageHeader eyebrow="Blogs" title="New post" description="It's saved as a draft until you set the status to Published." actions={<a href={routes.dashboardSection("blogs")} className={rowLinkClass}>← All posts</a>} />
      <Panel>
        <PostForm post={blank} />
      </Panel>
    </>
  );
}
