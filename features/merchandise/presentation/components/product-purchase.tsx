"use client";

import { useState } from "react";
import { CalendarClock, CircleAlert, CircleCheck, CircleX, Hammer, Minus, Plus, ShoppingBag, type LucideIcon } from "lucide-react";
import { isOrderable, offerFor, stockLabels, type StockStatus } from "@/features/merchandise/domain/entities";
import { SpriteButton } from "@/shared/components/ui/sprite-button";
import {
  findVariant,
  initialSelection,
  optionFieldName,
  optionGroups,
  quantityLimits,
  selectionLabel,
  selectValue,
  usesVariants,
  valueState,
  variantImageIndex,
  type PurchasableProduct,
  type ValueState,
} from "../lib/variants";
import { OrderForm } from "./order-form";
import { ProductPrice } from "./product-price";
import { usePhotoOnShow } from "./product-selection";

const STOCK: Record<StockStatus, { icon: LucideIcon; tone: string }> = {
  in_stock: { icon: CircleCheck, tone: "text-success" },
  low_stock: { icon: CircleAlert, tone: "text-primary" },
  out_of_stock: { icon: CircleX, tone: "text-error" },
  made_to_order: { icon: Hammer, tone: "text-primary" },
  preorder: { icon: CalendarClock, tone: "text-primary" },
};

const fieldLabel = "font-mono text-[11px] uppercase tracking-[0.16em] text-muted";

const chipStyles: Record<ValueState, string> = {
  selected: "border-primary bg-primary-soft text-strong",
  available: "border-line-strong text-foreground hover:border-primary",
  // Can be ordered, with other choices: a dashed edge, and choosing it switches them.
  elsewhere: "border-dashed border-line-strong text-muted hover:border-primary hover:text-foreground",
  unavailable: "cursor-not-allowed border-line text-muted/60 line-through",
};

const NO_SCRIPT = "<style>[data-order-form]{display:block!important}[data-order-open]{display:none!important}</style>";

/**
 * Everything beside the photos that changes as the buyer chooses, Daraz-style: the price
 * (with the usual price struck through and "-N%"), stock and SKU of the chosen variant, a row
 * of chips per option group (values that can't be ordered are disabled; choosing one shows
 * the variant's photo), the quantity, and "Order now", which opens the order form below.
 * The chips and quantity are fields of that form, so an order carries exactly what's shown.
 */
export function ProductPurchase({ product, imageCount, studioName, whatsapp }: { product: PurchasableProduct; imageCount: number; studioName: string; whatsapp: string }) {
  const { showImage } = usePhotoOnShow();
  const groups = optionGroups(product.options);
  const [selection, setSelection] = useState(() => initialSelection(product));
  const { min, max } = quantityLimits(product);
  const [quantityText, setQuantityText] = useState(String(min));
  const [open, setOpen] = useState(false);
  const formId = `order-${product.id}`;

  const variant = findVariant(product, selection);
  const missing = usesVariants(product) && !variant;
  const offer = offerFor(product, variant);
  const orderable = !missing && isOrderable(offer.stockStatus);
  const typed = Number.parseInt(quantityText, 10);
  const quantity = Number.isNaN(typed) ? min : Math.min(Math.max(typed, min), max);
  const setQuantity = (next: number) => setQuantityText(String(Math.min(Math.max(next, min), max)));
  const StockIcon = missing ? CircleX : STOCK[offer.stockStatus].icon;
  const limits =
    min > 1 && product.maxOrderQuantity ? `${min} to ${max} per order` : min > 1 ? `At least ${min} per order` : product.maxOrderQuantity ? `Up to ${max} per order` : "";

  const choose = (group: string, value: string) => {
    const next = selectValue(product, selection, group, value);
    setSelection(next);
    const photo = variantImageIndex(findVariant(product, next), imageCount);
    if (photo !== null) showImage(photo);
  };

  return (
    <div className="mt-6 flex flex-col gap-6">
      <div aria-live="polite">
        <ProductPrice size="page" price={offer.price} compareAtPrice={offer.compareAtPrice} discount={offer.discount} currency={product.currency} />
        <p className="mt-4 flex items-center gap-2 text-sm text-foreground">
          <StockIcon className={`h-4 w-4 shrink-0 ${missing ? "text-error" : STOCK[offer.stockStatus].tone}`} aria-hidden />
          {missing ? "This combination isn't available" : stockLabels[offer.stockStatus]}
        </p>
        {offer.sku && <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">SKU {offer.sku}</p>}
      </div>

      {groups.map((group, index) => (
        <fieldset key={group.name} className="min-w-0">
          <legend className={fieldLabel}>
            {group.name}: <span className="font-sans text-[13px] normal-case tracking-normal text-strong">{selection[group.name]}</span>
          </legend>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {group.values.map((value) => {
              const state = valueState(product, selection, group.name, value);
              return (
                <label
                  key={value}
                  className={`relative inline-flex min-h-11 cursor-pointer items-center rounded-control border px-4 text-sm transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary sm:min-h-10 ${chipStyles[state]}`}
                >
                  <input
                    type="radio"
                    form={formId}
                    name={optionFieldName(index)}
                    value={value}
                    checked={state === "selected"}
                    disabled={state === "unavailable"}
                    onChange={() => choose(group.name, value)}
                    className="sr-only"
                  />
                  {value}
                  {state === "unavailable" && <span className="sr-only"> (can&apos;t be ordered)</span>}
                  {state === "elsewhere" && <span className="sr-only"> (changes your other choices)</span>}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div>
        <p id={`${formId}-quantity`} className={fieldLabel}>
          Quantity
        </p>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="inline-flex items-center rounded-control border border-line-strong bg-raised">
            <button
              type="button"
              onClick={() => setQuantity(quantity - 1)}
              disabled={quantity <= min}
              aria-label="One fewer"
              className="flex size-11 items-center justify-center text-foreground transition-colors duration-150 hover:text-primary disabled:pointer-events-none disabled:opacity-35"
            >
              <Minus size={16} aria-hidden />
            </button>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              form={formId}
              name="quantity"
              value={quantityText}
              onChange={(event) => setQuantityText(event.target.value.replace(/\D/g, "").slice(0, 4))}
              onBlur={() => setQuantity(quantity)}
              aria-labelledby={`${formId}-quantity`}
              aria-describedby={limits ? `${formId}-limits` : undefined}
              className="h-11 w-14 border-x border-line-strong bg-transparent text-center text-[15px] tabular-nums text-strong focus:outline-none focus-visible:bg-surface"
            />
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              disabled={quantity >= max}
              aria-label="One more"
              className="flex size-11 items-center justify-center text-foreground transition-colors duration-150 hover:text-primary disabled:pointer-events-none disabled:opacity-35"
            >
              <Plus size={16} aria-hidden />
            </button>
          </div>
          {limits && (
            <p id={`${formId}-limits`} className="text-xs text-muted">
              {limits}
            </p>
          )}
        </div>
      </div>

      <div data-order-open hidden={open}>
        <SpriteButton onClick={() => setOpen(true)} disabled={!orderable} className="w-full sm:w-auto">
          {orderable ? (
            <>
              <ShoppingBag className="h-4 w-4" aria-hidden /> Order now
            </>
          ) : missing ? (
            "Not available"
          ) : (
            "Out of stock"
          )}
        </SpriteButton>
      </div>

      <OrderForm
        formId={formId}
        productId={product.id}
        open={open}
        orderable={orderable}
        summary={{ product: product.name, variant: selectionLabel(groups, selection), quantity, unitPrice: offer.price, currency: product.currency }}
        studioName={studioName}
        whatsapp={whatsapp}
        onCancel={() => setOpen(false)}
      />
      {/* Without JavaScript the form is simply open (the chips and quantity still post with it). */}
      <noscript dangerouslySetInnerHTML={{ __html: NO_SCRIPT }} />
    </div>
  );
}
