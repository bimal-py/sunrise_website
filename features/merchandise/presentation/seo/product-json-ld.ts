import type { SiteSettings } from "@/features/site/domain/entities";
import { offerFor, priceRange, type Product, type StockStatus } from "@/features/merchandise/domain/entities";
import { routes } from "@/lib/routes";
import { absoluteUrl } from "@/lib/seo/metadata";
import { largestPhoto } from "../lib/photos";
import { optionGroups, usesVariants } from "../lib/variants";

const AVAILABILITY: Record<StockStatus, string> = {
  in_stock: "https://schema.org/InStock",
  low_stock: "https://schema.org/LimitedAvailability",
  out_of_stock: "https://schema.org/OutOfStock",
  made_to_order: "https://schema.org/MadeToOrder",
  preorder: "https://schema.org/PreOrder",
};

/** Best first: a product with several variants is as available as its most available one. */
const RANK: StockStatus[] = ["in_stock", "low_stock", "made_to_order", "preorder", "out_of_stock"];

/**
 * Product structured data: name, description, photos (their biggest real files), SKU,
 * category, the studio as brand and seller, and an Offer, or an AggregateOffer (lowest and
 * highest price) when the variants cost different amounts. Only facts the owner entered: no
 * ratings, reviews, shipping or return terms.
 */
export function productJsonLd(product: Product, site: SiteSettings) {
  const url = absoluteUrl(routes.product(product.slug));
  const seller = { "@type": "LocalBusiness", "@id": absoluteUrl("/#studio"), name: site.name };
  const groups = optionGroups(product.options);
  const variants = usesVariants(product)
    ? product.variants.filter((variant) => groups.every((group) => variant.options?.[group.name] === undefined || group.values.includes(variant.options[group.name])))
    : [];
  const offers = variants.length > 0 ? variants.map((variant) => offerFor(product, variant)) : [offerFor(product, null)];
  const best = RANK.find((status) => offers.some((offer) => offer.stockStatus === status)) ?? product.stockStatus;
  const range = variants.length > 0 ? priceRange({ price: product.price, variants }) : { min: product.price, max: product.price };
  const sku = variants.length > 0 ? product.sku : offers[0].sku;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    ...(product.nameNe ? { alternateName: product.nameNe } : {}),
    description: product.seoDescription || product.summary || product.name,
    url,
    ...(product.images.length > 0 ? { image: product.images.map((image) => absoluteUrl(largestPhoto(image).src)) } : {}),
    ...(sku ? { sku } : {}),
    ...(product.category ? { category: product.category.name } : {}),
    brand: { "@type": "Brand", name: site.name },
    offers:
      range.min !== range.max
        ? {
            "@type": "AggregateOffer",
            priceCurrency: product.currency,
            lowPrice: range.min,
            highPrice: range.max,
            offerCount: offers.length,
            availability: AVAILABILITY[best],
            url,
            seller,
          }
        : {
            "@type": "Offer",
            price: range.min,
            priceCurrency: product.currency,
            availability: AVAILABILITY[best],
            url,
            seller,
          },
  };
}
