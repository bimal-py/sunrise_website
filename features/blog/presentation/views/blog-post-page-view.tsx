import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { siteConfig, whatsappUrl } from "@/lib/config/site";
import { routes } from "@/lib/routes";
import { breadcrumbJsonLd, type Crumb } from "@/lib/seo/breadcrumbs";
import { absoluteUrl } from "@/lib/seo/metadata";
import { formatDate } from "@/lib/utils/date";
import { blogRepository } from "@/features/blog/data/blog.repository";
import { tagSlug } from "@/features/blog/data/blog.utils";
import type { BlogPost } from "@/features/blog/domain/entities";
import { WhatsAppIcon } from "@/shared/components/brand/social-icons";
import { Breadcrumbs } from "@/shared/components/navigation/breadcrumbs";
import { JsonLd } from "@/shared/components/seo/json-ld";
import { Carousel } from "@/shared/components/ui/carousel";
import { SpriteButton } from "@/shared/components/ui/sprite-button";
import { TocNav } from "@/shared/components/navigation/toc-nav";
import { Container } from "@/shared/components/ui/container";
import { eyebrowClasses } from "@/shared/components/ui/section-heading";
import { BlogCard } from "../components/blog-card";

function articleJsonLd(post: BlogPost) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.summary,
    inLanguage: post.language,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    ...(post.coverImage ? { image: absoluteUrl(post.coverImage.ogImage) } : {}),
    author: { "@type": "Organization", name: post.author, url: absoluteUrl(routes.about()) },
    publisher: { "@type": "Organization", name: siteConfig.name, logo: { "@type": "ImageObject", url: absoluteUrl("/brand/logo-512.jpg") } },
    mainEntityOfPage: absoluteUrl(routes.post(post.slug)),
  };
}

/**
 * A guide, laid out like the owner's portfolio blog: breadcrumbs; the header
 * (topics, title, summary, a mono meta line); the cover with its credit; then
 * the article in a panel beside a sticky "On this page" (from xl; above the
 * article below it), the WhatsApp ask under the article, and "Keep reading":
 * the guides with the most topics in common, in the shared carousel.
 */
export async function BlogPostPageView({ slug }: { slug: string }) {
  const post = await blogRepository.getPost(slug);
  if (!post) notFound();
  const related = await blogRepository.listRelated(post.slug, 3);
  const updated = post.updatedAt && post.updatedAt.slice(0, 10) !== post.publishedAt.slice(0, 10) ? post.updatedAt : null;

  const crumbs: Crumb[] = [
    { label: "Home", href: routes.home() },
    { label: "Blog", href: routes.blog() },
    { label: post.title },
  ];

  return (
    <main>
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <JsonLd data={articleJsonLd(post)} />
      <Container narrow className="flex flex-col gap-8 pb-16 pt-8">
        <Breadcrumbs crumbs={crumbs} />

        <header className="flex flex-col gap-4">
          {post.tags.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="Topics">
              {post.tags.map((tag) => (
                <li key={tag}>
                  <Link
                    href={routes.blogTopic(tagSlug(tag))}
                    className="inline-flex h-7 items-center rounded-full border border-line-strong px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors duration-150 hover:border-primary hover:text-strong"
                  >
                    {tag}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <h1 lang={post.language} className="max-w-4xl text-balance break-words text-[38px] leading-[1.08] sm:text-[48px] lg:text-[56px]">
            {post.title}
          </h1>
          <p lang={post.language} className="max-w-3xl text-lg leading-8 text-muted">
            {post.summary}
          </p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-muted" lang="en">
            <span>By {post.author}</span>
            <span aria-hidden className="opacity-50">·</span>
            <span>{post.readingTimeMinutes} min read</span>
            <span aria-hidden className="opacity-50">·</span>
            <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
            {updated && (
              <>
                <span aria-hidden className="opacity-50">·</span>
                <span>
                  Updated <time dateTime={updated}>{formatDate(updated)}</time>
                </span>
              </>
            )}
          </p>
        </header>

        {post.coverImage && (
          <figure>
            <Image
              src={post.coverImage.src}
              alt={post.coverImage.alt}
              width={post.coverImage.width}
              height={post.coverImage.height}
              sizes="(min-width: 1152px) 1088px, 100vw"
              priority
              placeholder="blur"
              blurDataURL={post.coverImage.blurDataURL}
              className="aspect-video w-full rounded-card border border-line object-cover"
            />
            {post.coverImage.credit && (
              <figcaption className="mt-2 text-xs text-muted" lang="en">
                Photo:{" "}
                <a href={post.coverImage.creditUrl} className="underline underline-offset-2 hover:text-primary" target="_blank" rel="noopener noreferrer">
                  {post.coverImage.credit}
                </a>
                {post.coverImage.license && (
                  <>
                    ,{" "}
                    <a href={post.coverImage.licenseUrl} className="underline underline-offset-2 hover:text-primary" target="_blank" rel="noopener noreferrer">
                      {post.coverImage.license}
                    </a>
                  </>
                )}
              </figcaption>
            )}
          </figure>
        )}

        {/* The article (wide) and "On this page": a sticky sidebar from xl, above the article below it. */}
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_16rem] xl:items-start">
          <div className="flex min-w-0 flex-col gap-8">
            <article lang={post.language} className="prose-article rounded-panel border border-line bg-surface px-5 py-8 sm:px-10 sm:py-10">
              {post.content}
            </article>
            <aside className="flex flex-col gap-4 rounded-panel border border-line bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-strong">Planning a wedding or a ceremony?</p>
                <p className="mt-1 text-sm text-muted">Tell us the date and the place, and we&apos;ll tell you if we&apos;re free.</p>
              </div>
              <SpriteButton
                href={whatsappUrl(`Hello ${siteConfig.name}, I read "${post.title}" on your website and I'd like to ask about booking.`)}
                className="shrink-0"
              >
                <WhatsAppIcon className="h-4 w-4" /> Ask on WhatsApp
              </SpriteButton>
            </aside>
          </div>
          {post.headings.length > 1 && (
            <div className="order-first xl:order-none xl:sticky xl:top-28 xl:self-start">
              <TocNav itemsLang={post.language} items={post.headings.map((heading) => ({ id: heading.id, label: heading.text, indent: heading.depth === 3 }))} />
            </div>
          )}
        </div>
      </Container>

      {related.length > 0 && (
        <section aria-labelledby="more-heading" className="pb-20">
          <Container narrow>
            <p className={eyebrowClasses}>More guides</p>
            <h2 id="more-heading" className="mt-2 text-[30px] sm:text-[36px]">
              Keep reading
            </h2>
          </Container>
          <div className="mt-8">
            <Carousel
              label="More guides"
              className="carousel-narrow"
              center={
                <Link href={routes.blog()} className="inline-flex items-center py-1 text-sm font-medium text-primary underline underline-offset-4 hover:text-primary-strong">
                  All guides
                </Link>
              }
            >
              {related.map((other) => (
                <BlogCard key={other.slug} post={other} className="w-[82vw] shrink-0 snap-start sm:w-[340px] lg:w-[348px]" />
              ))}
            </Carousel>
          </div>
        </section>
      )}
    </main>
  );
}
