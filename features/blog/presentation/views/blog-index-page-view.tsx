import { Suspense } from "react";
import { blogRepository } from "@/features/blog/data/blog.repository";
import { tagSlug } from "@/features/blog/data/blog.utils";
import { ListFilterSync, type FilterTarget } from "@/shared/components/filter/list-filter";
import { PagedGrid } from "@/shared/components/filter/paged-grid";
import { Container } from "@/shared/components/ui/container";
import { eyebrowClasses } from "@/shared/components/ui/section-heading";
import { BlogCard } from "../components/blog-card";
import { BlogResults, BlogTopicNav } from "../components/blog-filters";
import { BlogSearch } from "../components/blog-search";

/** Guides per "page" of the grid (3 rows of 3); more appear as you scroll. */
const PAGE_SIZE = 9;

/**
 * The blog's front page, centred like the home scenes: eyebrow, title, the
 * Nepali line, a one-line lede and the search, then the topics as chips, then
 * the guides three across. One static page: topic and search (?tag=, ?q=) filter
 * it in the browser, so they can be shared without costing a server render.
 */
export async function BlogIndexPageView() {
  const [posts, tags] = await Promise.all([blogRepository.listPosts(), blogRepository.listTags()]);
  const topics = tags.map(({ tag }) => ({ label: tag, slug: tagSlug(tag) }));
  const targets: FilterTarget[] = posts.map((post) => ({
    tags: post.tags.map(tagSlug),
    text: [post.title, post.summary, ...post.tags].join(" "),
  }));

  return (
    <main>
      <Suspense fallback={null}>
        <ListFilterSync />
      </Suspense>
      <Container className="pb-20 pt-10">
        <header className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <p className={eyebrowClasses}>Blog</p>
          <h1 className="mt-3 text-balance text-[38px] leading-[1.08] sm:text-[52px]">Guides for your big days</h1>
          <p lang="ne" className="mt-2 text-muted">
            तयारीका लागि सुझाव
          </p>
          <p className="mt-5 max-w-xl text-muted">
            Planning wedding photos and films, what to capture at a pasni or bratabandha, and choosing print sizes, frames and albums.
          </p>
          <div className="mt-8 flex w-full justify-center">
            <BlogSearch />
          </div>
        </header>

        <BlogTopicNav topics={topics} />

        <div className="mt-12">
          <BlogResults targets={targets} topics={topics} />
          <PagedGrid targets={targets} pageSize={PAGE_SIZE} noun="guides" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <BlogCard key={post.slug} post={post} />
            ))}
          </PagedGrid>
        </div>
      </Container>
    </main>
  );
}
