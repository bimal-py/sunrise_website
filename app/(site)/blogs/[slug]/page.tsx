import type { Metadata } from "next";
import { blogRepository } from "@/features/blog/data/blog.repository";
import { BlogPostPageView } from "@/features/blog/presentation/views/blog-post-page-view";
import { routes } from "@/lib/routes";
import { buildArticleMetadata } from "@/lib/seo/metadata";

type PageProps = { params: Promise<{ slug: string }> };

// No dynamicParams = false: a slug created in the dashboard after the last deploy renders on its first
// visit (then stays static until a save refreshes it); unknown slugs 404 or follow a saved redirect.

export async function generateStaticParams() {
  const posts = await blogRepository.listPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  // The preview has everything metadata needs; the body is compiled once, by the page.
  const post = (await blogRepository.listPosts()).find((p) => p.slug === slug);
  if (!post) return { title: "Post not found" };

  return buildArticleMetadata({
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.summary,
    path: routes.post(post.slug),
    image: post.coverImage?.ogImage,
    publishedTime: post.publishedAt,
    modifiedTime: post.updatedAt,
    authors: [post.author],
    keywords: post.tags,
  });
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  return <BlogPostPageView slug={slug} />;
}
