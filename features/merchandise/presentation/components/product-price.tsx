import { formatPrice } from "@/features/merchandise/domain/entities";

type ProductPriceProps = {
  price: number;
  compareAtPrice: number | null;
  discount: number | null;
  currency: string;
  /** The lowest of several prices (a card for a product whose options cost different amounts). */
  from?: boolean;
  /** card: a line under the name; page: the product page's large price with its "-N%". */
  size?: "card" | "page";
};

/**
 * The price in gold and, when it's lower than usual, the usual price struck through (the
 * card shows its "-N%" on the photo, the product page beside the usual price). Server-safe,
 * so cards render it on the server and the product page's options re-render it in the browser.
 */
export function ProductPrice({ price, compareAtPrice, discount, currency, from = false, size = "card" }: ProductPriceProps) {
  const page = size === "page";
  const reduced = discount !== null && compareAtPrice !== null;
  return (
    <p className={`flex flex-wrap items-baseline ${page ? "gap-x-3 gap-y-2" : "gap-x-2"}`}>
      <span className={`font-semibold tabular-nums text-primary ${page ? "text-[32px] leading-none tracking-tight" : "text-[15px]"}`}>
        {from && <span className={page ? "mr-1.5 text-base font-medium" : "mr-1 text-xs font-medium"}>From</span>}
        {formatPrice(price, currency)}
      </span>
      {reduced && (
        <s className={`tabular-nums text-muted ${page ? "text-base" : "text-xs"}`}>
          <span className="sr-only">Usual price </span>
          {formatPrice(compareAtPrice, currency)}
        </s>
      )}
      {reduced && page && (
        <span className="rounded-full bg-primary-soft px-2.5 py-0.5 font-mono text-xs font-semibold text-primary">
          <span aria-hidden>-{discount}%</span>
          <span className="sr-only">{discount}% off</span>
        </span>
      )}
    </p>
  );
}
