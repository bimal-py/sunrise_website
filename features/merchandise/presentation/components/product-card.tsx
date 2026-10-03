import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/features/merchandise/domain/entities";
import { routes } from "@/lib/routes";
import { AfBrackets } from "@/shared/components/ui/af-brackets";
import { cardOffer } from "../lib/variants";
import { ProductPrice } from "./product-price";

/** Two across on phones, three on tablets, four from lg (the grid and "More from …"). */
export const PRODUCT_CARD_SIZES = "(min-width: 1280px) 290px, (min-width: 1024px) 24vw, (min-width: 768px) 32vw, 50vw";

const badge = "absolute top-2.5 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold";

/**
 * A shop tile: the square photo (with "-20%" when it's reduced and "Out of stock" when
 * nothing can be ordered), the name, the price with the usual price struck through, and the
 * category. The whole card is one link; pointed at, the autofocus brackets snap onto it.
 */
export function ProductCard({ product, sizes = PRODUCT_CARD_SIZES }: { product: Product; sizes?: string }) {
  const offer = cardOffer(product);
  const photo = product.images[0];

  return (
    <article className="af-card group relative flex h-full flex-col rounded-card border border-line bg-surface transition-colors duration-150 hover:border-line-strong">
      <AfBrackets />
      <div className="relative overflow-hidden rounded-t-[7px] bg-raised">
        {photo ? (
          <Image
            src={photo.src}
            alt={photo.alt || product.name}
            width={photo.width}
            height={photo.height}
            sizes={sizes}
            placeholder="blur"
            blurDataURL={photo.blurDataURL}
            className="aspect-square w-full object-cover"
          />
        ) : (
          <div className="aspect-square w-full" />
        )}
        {offer.discount !== null && !offer.soldOut && (
          <span className={`${badge} left-2.5 bg-primary text-on-primary`}>
            <span aria-hidden>-{offer.discount}%</span>
            <span className="sr-only">{offer.discount}% off</span>
          </span>
        )}
        {offer.soldOut && <span className={`${badge} right-2.5 border border-line-strong bg-background/85 uppercase tracking-[0.12em] text-foreground`}>Out of stock</span>}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug transition-colors duration-150 group-hover:text-primary">
          {/* Stretched link: the whole card is clickable, one link in the markup. */}
          <Link href={routes.product(product.slug)} className="after:absolute after:inset-0">
            {product.name}
          </Link>
        </h3>
        <div className="mt-auto pt-1">
          <ProductPrice price={offer.price} compareAtPrice={offer.compareAtPrice} discount={offer.discount} currency={product.currency} from={offer.from} />
        </div>
        {product.category && <p className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{product.category.name}</p>}
      </div>
    </article>
  );
}
