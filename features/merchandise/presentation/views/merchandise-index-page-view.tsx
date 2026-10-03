import Link from "next/link";
import { Suspense } from "react";
import { whatsappUrl } from "@/lib/config/site";
import { routes } from "@/lib/routes";
import { itemListJsonLd } from "@/lib/seo/structured-data";
import { merchandiseRepository } from "@/features/merchandise/data/merchandise.repository";
import { getPage } from "@/features/site/data/pages.repository";
import { getSiteSettings } from "@/features/site/data/settings.repository";
import { pageCopy } from "@/features/site/domain/page-content";
import { ListFilterSync, type FilterTarget } from "@/shared/components/filter/list-filter";
import { PagedGrid } from "@/shared/components/filter/paged-grid";
import { JsonLd } from "@/shared/components/seo/json-ld";
import { Container } from "@/shared/components/ui/container";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { eyebrowClasses } from "@/shared/components/ui/section-heading";
import { MerchandiseCategoryNav, MerchandiseResults, type CategoryChip } from "../components/merchandise-filters";
import { MerchandiseSearch } from "../components/merchandise-search";
import { ProductCard } from "../components/product-card";

/** Products per "page" of the grid (3 rows of 4); more appear as you scroll. */
const PAGE_SIZE = 12;

/**
 * The shop, centred like the blog: eyebrow, title, the Nepali line, the lede (Pages →
 * Merchandise) and the search, then the categories as chips, then the products four across
 * (two on phones). One static page: category and search (?category=, ?q=) filter it in the
 * browser, so they can be shared without costing a server render.
 */
export async function MerchandiseIndexPageView() {
  const [products, categories, page, site] = await Promise.all([
    merchandiseRepository.listProducts(),
    merchandiseRepository.listCategories(),
    getPage("merchandise"),
    getSiteSettings(),
  ]);
  const copy = pageCopy("merchandise", page.content);
  const chips: CategoryChip[] = categories.map((category) => ({ slug: category.slug, label: category.name }));
  const targets: FilterTarget[] = products.map((product) => ({
    group: product.category?.slug,
    text: [product.name, product.nameNe, product.summary, product.category?.name ?? "", product.category?.nameNe ?? "", ...product.highlights].join(" "),
  }));

  return (
    <main>
      {products.length > 0 && (
        <JsonLd data={itemListJsonLd(`Merchandise from ${site.name}`, products.map((product) => ({ name: product.name, path: routes.product(product.slug) })))} />
      )}
      <Suspense fallback={null}>
        <ListFilterSync />
      </Suspense>
      <Container className="pb-20 pt-10">
        <header className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <p className={eyebrowClasses}>{copy.eyebrow}</p>
          <h1 className="mt-3 text-balance text-[38px] leading-[1.08] sm:text-[52px]">{copy.title}</h1>
          <p lang="ne" className="mt-2 text-muted">
            {copy.titleNe}
          </p>
          <p className="mt-5 max-w-xl text-muted">{copy.lede}</p>
          {products.length > 0 && (
            <div className="mt-8 flex w-full justify-center">
              <MerchandiseSearch />
            </div>
          )}
        </header>

        {products.length > 0 && <MerchandiseCategoryNav categories={chips} />}

        <div className="mt-12">
          {products.length === 0 ? (
            <EmptyState title="Nothing to order here yet">
              We&apos;re getting the first things ready. Meanwhile, see our{" "}
              <Link href={routes.prints()} className="text-primary underline underline-offset-4 hover:text-primary-strong">
                albums, frames and prints
              </Link>
              {site.contact.whatsapp && (
                <>
                  {" "}
                  or{" "}
                  <a
                    href={whatsappUrl(site.contact.whatsapp, `Hello ${site.name}, I'd like to ask about ordering something from the studio.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-4 hover:text-primary-strong"
                  >
                    ask us on WhatsApp
                  </a>
                </>
              )}
              .
            </EmptyState>
          ) : (
            <>
              <MerchandiseResults targets={targets} categories={chips} />
              <PagedGrid targets={targets} pageSize={PAGE_SIZE} noun="products" className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </PagedGrid>
            </>
          )}
        </div>
      </Container>
    </main>
  );
}
