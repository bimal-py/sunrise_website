import Link from "next/link";
import { routes } from "@/lib/routes";
import { blogRepository } from "@/features/blog/data/blog.repository";
import { tagSlug } from "@/features/blog/data/blog.utils";
import { Container } from "@/shared/components/ui/container";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { eyebrowClasses } from "@/shared/components/ui/section-heading";
import { BlogCard } from "../components/blog-card";
import { BlogSearch } from "../components/blog-search";

const chip = "inline-flex h-8 items-center rounded-full border px-4 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors duration-150";

/**
 * The blog's front page, centred like the home scenes: eyebrow, title, the
 * Nepali line, a one-line lede and the search, then the topics as chips, then
 * the guides three across. Topic and search are URL state (?tag=, ?q=), so a
 * filtered view renders on the server and can be shared; each keeps the other.
 */
export async function BlogIndexPageView({ tag, q }: { tag?: string; q?: string }) {
  const [posts, tags] = await Promise.all([blogRepository.listPosts({ tag, q }), blogRepository.listTags()]);
  const topic = tags.find(({ tag: label }) => tagSlug(label) === tag)?.tag;
  const filtered = Boolean(tag || q?.trim());

  return (
    <main>
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
            <BlogSearch q={q} tag={tag} />
          </div>
        </header>

        {tags.length > 0 && (
          <nav aria-label="Topics" className="mt-6 flex flex-wrap justify-center gap-2">
            {[
              { label: "All", href: routes.blogFind({ q }), active: !tag },
              ...tags.map(({ tag: label }) => ({ label, href: routes.blogFind({ tag: tagSlug(label), q }), active: tag === tagSlug(label) })),
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                scroll={false}
                aria-current={item.active ? "page" : undefined}
                className={`${chip} ${item.active ? "border-primary bg-primary-soft text-primary" : "border-line-strong text-muted hover:border-primary hover:text-strong"}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="mt-12">
          {filtered && posts.length > 0 && (
            <p className="mb-6 text-center font-mono text-[11px] uppercase tracking-[0.15em] text-muted">
              {posts.length} {posts.length === 1 ? "guide" : "guides"}
              {topic && ` on ${topic}`}
              {q?.trim() && ` matching “${q.trim()}”`}
            </p>
          )}
          {posts.length === 0 ? (
            <EmptyState title={filtered ? "No matching guides" : "No guides yet"}>
              {filtered ? (
                <>
                  Try other words or another topic, or{" "}
                  <Link href={routes.blog()} className="text-primary underline underline-offset-4 hover:text-primary-strong">
                    clear the filters
                  </Link>
                  .
                </>
              ) : (
                "New guides are on the way."
              )}
            </EmptyState>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <BlogCard key={post.slug} post={post} />
              ))}
            </div>
          )}
        </div>
      </Container>
    </main>
  );
}
