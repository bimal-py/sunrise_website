import Image from "next/image";
import { notFound } from "next/navigation";
import { siteConfig, whatsappUrl } from "@/lib/config/site";
import { routes } from "@/lib/routes";
import { breadcrumbJsonLd, type Crumb } from "@/lib/seo/breadcrumbs";
import { absoluteUrl } from "@/lib/seo/metadata";
import { formatDate } from "@/lib/utils/date";
import { blogRepository } from "@/features/blog/data/blog.repository";
import type { BlogPost } from "@/features/blog/domain/entities";
import { WhatsAppIcon } from "@/shared/components/brand/social-icons";
import { Breadcrumbs } from "@/shared/components/navigation/breadcrumbs";
import { JsonLd } from "@/shared/components/seo/json-ld";
import { Badge } from "@/shared/components/ui/badge";
import { SpriteButton } from "@/shared/components/ui/sprite-button";
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

export async function BlogPostPageView({ slug }: { slug: string }) {
  const post = await blogRepository.getPost(slug);
  if (!post) notFound();
  const more = (await blogRepository.listPosts()).filter((other) => other.slug !== post.slug).slice(0, 3);

  const crumbs: Crumb[] = [
    { label: "Home", href: routes.home() },
    { label: "Blog", href: routes.blog() },
    { label: post.title },
  ];

  return (
    <main>
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <JsonLd data={articleJsonLd(post)} />
      <Container narrow className="pt-8 pb-20">
        <Breadcrumbs crumbs={crumbs} />

        <article lang={post.language} className="mt-6">
          <header className="max-w-3xl">
            <div className="flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </div>
            <h1 className="mt-4 text-[38px] sm:text-[52px]">{post.title}</h1>
            <p className="mt-4 text-lg text-muted">{post.summary}</p>
            <p className="mt-4 text-sm text-muted" lang="en">
              <span className="font-medium text-foreground">{post.author}</span> ·{" "}
              <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time> · {post.readingTimeMinutes} min read
            </p>
          </header>

          {post.coverImage && (
            <figure className="mt-8">
              <Image
                src={post.coverImage.src}
                alt={post.coverImage.alt}
                width={post.coverImage.width}
                height={post.coverImage.height}
                sizes="(min-width: 1152px) 1088px, 100vw"
                priority
                placeholder="blur"
                blurDataURL={post.coverImage.blurDataURL}
                className="aspect-[3/2] w-full rounded-card object-cover sm:aspect-[2/1]"
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

          <div className="mt-10 grid gap-10 xl:grid-cols-[minmax(0,1fr)_260px]">
            {post.headings.length > 1 && (
              <aside className="xl:col-start-2 xl:row-start-1">
                <nav aria-label="On this page" className="rounded-card border border-line bg-surface p-5 xl:sticky xl:top-28">
                  <p className={eyebrowClasses} lang="en">
                    On this page
                  </p>
                  <ul className="mt-3 flex flex-col text-sm">
                    {post.headings.map((heading) => (
                      <li key={heading.id} className={heading.depth === 3 ? "pl-3" : undefined}>
                        <a href={`#${heading.id}`} className="inline-block py-1 text-muted transition-colors duration-150 hover:text-primary">
                          {heading.text}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              </aside>
            )}
            <div className="prose-article max-w-3xl xl:col-start-1 xl:row-start-1">{post.content}</div>
          </div>
        </article>

        <aside className="mt-14 flex max-w-3xl flex-col gap-4 rounded-panel border border-line bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
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

        {more.length > 0 && (
          <section aria-labelledby="more-heading" className="mt-16 border-t border-line pt-10">
            <h2 id="more-heading" className="mb-6 text-[30px]">
              More guides
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {more.map((other) => (
                <BlogCard key={other.slug} post={other} />
              ))}
            </div>
          </section>
        )}
      </Container>
    </main>
  );
}
