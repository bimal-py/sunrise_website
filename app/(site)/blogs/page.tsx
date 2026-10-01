import type { Metadata } from "next";
import { BlogIndexPageView } from "@/features/blog/presentation/views/blog-index-page-view";
import { routes } from "@/lib/routes";
import { buildPageMetadata } from "@/lib/seo/metadata";

// Static: ?tag= and ?q= views are the same file filtered in the browser, and canonical to /blogs.
export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: "Blog: guides to wedding photos, ceremonies and prints",
    description: "Planning wedding photos and films in Nepal, what to capture at a pasni or bratabandha, and choosing print sizes, frames and albums.",
    path: routes.blog(),
    page: "blogs",
  });
}

export default function BlogsPage() {
  return <BlogIndexPageView />;
}
