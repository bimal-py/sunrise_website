import type { Metadata } from "next";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { DashboardPageHeader } from "@/features/dashboard/presentation/components/ui/dashboard-page-header";
import { blankPost, PostForm } from "@/features/blog/presentation/components/post-form";

export const metadata: Metadata = { title: "Create a new blog" };

export default async function NewPostPage() {
  await requireAdmin();
  // The post's id is made here, so pressing Create twice (or again after a lost reply) saves one post, not two.
  const id = crypto.randomUUID();
  return (
    <div className="grid gap-8">
      <DashboardPageHeader
        eyebrow="Blogs"
        title="Create a new blog"
        description="Write the guide here, then publish it when the summary, cover and text are ready. It stays a private draft until then."
      />
      <PostForm post={blankPost(id)} mode="create" />
    </div>
  );
}
