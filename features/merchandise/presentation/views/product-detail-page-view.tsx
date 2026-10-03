import Link from "next/link";
import { Check } from "lucide-react";
import { routes } from "@/lib/routes";
import { breadcrumbJsonLd, type Crumb } from "@/lib/seo/breadcrumbs";
import { absoluteUrl } from "@/lib/seo/metadata";
import { merchandiseRepository } from "@/features/merchandise/data/merchandise.repository";
import type { Product } from "@/features/merchandise/domain/entities";
import { redirectOrNotFound } from "@/features/site/data/redirects.repository";
import { getSiteSettings } from "@/features/site/data/settings.repository";
import { Breadcrumbs } from "@/shared/components/navigation/breadcrumbs";
import { JsonLd } from "@/shared/components/seo/json-ld";
import { Container } from "@/shared/components/ui/container";
import { eyebrowClasses } from "@/shared/components/ui/section-heading";
import { ViewAllLink } from "@/shared/components/ui/view-all-link";
import type { PurchasableProduct } from "../lib/variants";
import { ProductCard } from "../components/product-card";
import { ProductDescription } from "../components/product-description";
import { ProductGallery } from "../components/product-gallery";
import { ProductPurchase } from "../components/product-purchase";
import { ProductSelectionProvider } from "../components/product-selection";
import { ProductSideBox } from "../components/product-side-box";
import { productJsonLd } from "../seo/product-json-ld";

const sectionTitle = "text-[30px] sm:text-[36px]";
/** "More from …": two across on phones, four from md. */
const RELATED_SIZES = "(min-width: 1280px) 290px, (min-width: 768px) 24vw, 50vw";

/** Only what the options and the order form need goes to the browser (not the description). */
function purchasable(product: Product): PurchasableProduct {
  const { id, slug, name, currency, price, compareAtPrice, sku, stockStatus, options, variants, minOrderQuantity, maxOrderQuantity } = product;
  return { id, slug, name, currency, price, compareAtPrice, sku, stockStatus, options, variants, minOrderQuantity, maxOrderQuantity };
}

/**
 * A product page, laid out like Daraz in Sunrise's theme: breadcrumbs; then the photos
 * (zoom, swipe, full screen), the details and options with "Order now", and a box with
 * delivery, warranty and the seller, three across from xl (two from lg, the box under the
 * options; one column on phones); then highlights, the description, the specifications and
 * more from the same category. Static: rebuilt only when the dashboard saves merchandise.
 */
export async function ProductDetailPageView({ slug }: { slug: string }) {
  const [product, site] = await Promise.all([merchandiseRepository.getProduct(slug), getSiteSettings()]);
  if (!product) return redirectOrNotFound(routes.product(slug));
  const related = await merchandiseRepository.listRelated(product, 4);
  const { category } = product;
  // Same category first, topped up with others: the heading names the category only when every card is in it.
  const relatedCategory = category && related.every((other) => other.category?.id === category.id) ? category : null;

  const crumbs: Crumb[] = [
    { label: "Home", href: routes.home() },
    { label: "Merchandise", href: routes.merchandise() },
    ...(category ? [{ label: category.name, href: routes.merchandiseCategory(category.slug) }] : []),
    { label: product.name },
  ];
  const specifications = [
    ...product.specifications.filter((spec) => spec.label.trim() && spec.value.trim()),
    ...(product.sku ? [{ label: "SKU", value: product.sku }] : []),
  ];
  const highlights = product.highlights.filter((highlight) => highlight.trim());
  const askMessage = `Hello ${site.name}, I'd like to ask about "${product.name}" (${absoluteUrl(routes.product(product.slug))}).`;

  return (
    <main>
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <JsonLd data={productJsonLd(product, site)} />
      <Container className="pb-20 pt-8">
        <Breadcrumbs crumbs={crumbs} />

        <ProductSelectionProvider>
          <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-x-10 xl:grid-cols-[minmax(0,5fr)_minmax(0,5fr)_minmax(0,3.3fr)] xl:gap-x-8">
            {/* Above the details (z-10) so the zoom pane floats over them. */}
            <div className="relative z-10 min-w-0 lg:sticky lg:top-28 lg:row-span-2 lg:self-start xl:row-span-1">
              <ProductGallery images={product.images} name={product.name} />
            </div>

            <div className="min-w-0">
              {category && (
                <Link href={routes.merchandiseCategory(category.slug)} className={`${eyebrowClasses} inline-block py-1 hover:text-primary-strong`}>
                  {category.name}
                </Link>
              )}
              <h1 className="mt-2 text-balance break-words text-[38px] leading-[1.08] sm:text-[46px]">{product.name}</h1>
              {product.nameNe && (
                <p lang="ne" className="mt-1.5 text-lg text-foreground">
                  {product.nameNe}
                </p>
              )}
              {product.summary && <p className="mt-4 text-muted">{product.summary}</p>}
              <ProductPurchase product={purchasable(product)} imageCount={product.images.length} studioName={site.name} whatsapp={site.contact.whatsapp} />
            </div>

            <ProductSideBox deliveryInfo={product.deliveryInfo} warrantyInfo={product.warrantyInfo} site={site} whatsappMessage={askMessage} />
          </div>
        </ProductSelectionProvider>

        {(highlights.length > 0 || product.description.trim() || specifications.length > 0 || category) && (
          <div className="mt-16 grid gap-12 border-t border-line pt-12 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
            <div className="flex min-w-0 flex-col gap-12">
              {highlights.length > 0 && (
                <section aria-labelledby="highlights-heading">
                  <h2 id="highlights-heading" className={sectionTitle}>
                    Highlights
                  </h2>
                  <ul className="mt-5 grid gap-3">
                    {highlights.map((highlight, index) => (
                      <li key={index} className="flex items-start gap-3 text-foreground">
                        <Check className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden />
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {product.description.trim() && (
                <section aria-labelledby="description-heading">
                  <h2 id="description-heading" className={`${sectionTitle} mb-5`}>
                    Description
                  </h2>
                  <ProductDescription source={product.description} />
                </section>
              )}
            </div>

            {(specifications.length > 0 || category) && (
              <section aria-labelledby="specifications-heading" className="min-w-0 lg:sticky lg:top-28">
                <h2 id="specifications-heading" className={sectionTitle}>
                  Specifications
                </h2>
                <div className="mt-5 overflow-hidden rounded-card border border-line">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-line">
                    {category && (
                      <tr>
                        <th scope="row" className="w-2/5 bg-surface px-4 py-3 text-left align-top font-medium text-muted">
                          Category
                        </th>
                        <td className="px-4 py-3 align-top">
                          <Link href={routes.merchandiseCategory(category.slug)} className="text-primary underline-offset-4 hover:underline">
                            {category.name}
                          </Link>
                        </td>
                      </tr>
                    )}
                    {specifications.map((spec, index) => (
                      <tr key={`${spec.label}-${index}`}>
                        <th scope="row" className="w-2/5 bg-surface px-4 py-3 text-left align-top font-medium text-muted">
                          {spec.label}
                        </th>
                        <td className="whitespace-pre-line break-words px-4 py-3 align-top text-strong">{spec.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </section>
            )}
          </div>
        )}

        {related.length > 0 && (
          <section aria-labelledby="more-heading" className="mt-16 border-t border-line pt-10">
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className={eyebrowClasses}>Merchandise</p>
                <h2 id="more-heading" className={`${sectionTitle} mt-3`}>
                  {relatedCategory ? `More from ${relatedCategory.name}` : "More from the studio"}
                </h2>
              </div>
              <ViewAllLink href={relatedCategory ? routes.merchandiseCategory(relatedCategory.slug) : routes.merchandise()}>
                {relatedCategory ? `All ${relatedCategory.name}` : "Everything in the shop"}
              </ViewAllLink>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">
              {related.map((other) => (
                <ProductCard key={other.id} product={other} sizes={RELATED_SIZES} />
              ))}
            </div>
          </section>
        )}
      </Container>
    </main>
  );
}
