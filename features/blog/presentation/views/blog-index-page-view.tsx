import Link from "next/link";
import { routes } from "@/lib/routes";
import { blogRepository } from "@/features/blog/data/blog.repository";
import { tagSlug } from "@/features/blog/data/blog.utils";
import { Container } from "@/shared/components/ui/container";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { SectionHeading } from "@/shared/components/ui/section-heading";
import { BlogCard } from "../components/blog-card";

const chip = "inline-flex h-9 items-center rounded-control border px-3 text-sm transition-colors duration-150";

export async function BlogIndexPageView({ tag }: { tag?: string }) {
  const [posts, tags] = await Promise.all([blogRepository.listPosts({ tag }), blogRepository.listTags()]);

  return (
    <main>
      <Container className="pt-10 pb-20">
        <SectionHeading
          as="h1"
          eyebrow="Blog"
          title="Guides for your big days"
          titleNe="तयारीका लागि सुझाव"
          description="Planning wedding photos and films, what to capture at a pasni or bratabandha, and choosing print sizes, frames and albums."
        />

        {tags.length > 0 && (
          <nav aria-label="Topics" className="mb-8 flex flex-wrap gap-2">
            {[
              { label: "All", href: routes.blog(), active: !tag },
              ...tags.map(({ tag: label }) => ({ label, href: routes.blogTopic(tagSlug(label)), active: tag === tagSlug(label) })),
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={item.active ? "page" : undefined}
                className={`${chip} ${item.active ? "border-primary bg-primary-soft text-strong" : "border-line-strong text-foreground hover:border-primary"}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        {posts.length === 0 ? (
          <EmptyState title="No articles on this topic yet">New guides are on the way.</EmptyState>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <BlogCard key={post.slug} post={post} />
            ))}
          </div>
        )}
      </Container>
    </main>
  );
}
