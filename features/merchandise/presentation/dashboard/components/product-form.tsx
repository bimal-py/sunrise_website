import type { ProductCategoryRow, ProductRow } from "@/lib/supabase/types";
import { routes } from "@/lib/routes";
import { MdxField } from "@/features/dashboard/presentation/components/mdx-field";
import { RepeatableField } from "@/features/dashboard/presentation/components/repeatable-field";
import { DashboardForm } from "@/features/dashboard/presentation/components/ui/dashboard-form";
import {
  DashboardCheckbox,
  DashboardField,
  DashboardInput,
  DashboardSelect,
  DashboardTextarea,
  FieldGroup,
} from "@/features/dashboard/presentation/components/ui/dashboard-ui";
import { ImageGalleryField } from "@/features/dashboard/presentation/components/ui/image-url-field";
import { SeoFieldset } from "@/features/dashboard/presentation/components/ui/seo-fieldset";
import { saveProduct } from "../actions/products";
import { CURRENCIES, isStockStatus, PRODUCT_LIMITS, STOCK_CHOICES, type VariantInput } from "../catalogue-options";
import { CategoryField } from "./category-field";
import { VariantsEditor } from "./variants-editor";

/** A stored amount as the editor shows it: "1500", "1499.50"; blank for none. */
function moneyText(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "";
  const value = Number(amount);
  if (!Number.isFinite(value)) return "";
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

/**
 * The product editor, in the portfolio's form card: Basics, Photos, Price & stock, Options &
 * variants, Specifications, Delivery & warranty and Visibility, each in its own box, then
 * "SEO & social" and the save button. Saving goes back to the products list.
 */
export function ProductForm({
  product,
  categories,
  defaultSortOrder,
}: {
  product: ProductRow | null;
  categories: Pick<ProductCategoryRow, "id" | "name" | "published">[];
  defaultSortOrder: number;
}) {
  const p = product;
  const images = p?.images ?? [];
  const variants: VariantInput[] = (p?.variants ?? []).map((variant) => ({
    id: variant.id,
    options: variant.options ?? {},
    price: moneyText(variant.price),
    compareAtPrice: moneyText(variant.compareAtPrice),
    sku: variant.sku ?? "",
    stockStatus: isStockStatus(variant.stockStatus) ? variant.stockStatus : "in_stock",
    imageSrc: variant.imageIndex !== null && variant.imageIndex !== undefined ? (images[variant.imageIndex]?.src ?? "") : "",
  }));
  const currency = p?.currency ?? "NPR";
  const knownCurrency = CURRENCIES.some((option) => option.code === currency);

  return (
    <DashboardForm action={saveProduct} submitLabel={p ? "Save product" : "Create product"} pendingLabel={p ? "Saving…" : "Creating…"}>
      {p ? <input type="hidden" name="id" value={p.id} /> : null}

      <FieldGroup title="Basics">
        <div className="grid gap-5 md:grid-cols-2">
          <DashboardField label="Name" required help="The product's name, as the shop, its page and order messages show it." example="Walnut photo frame">
            <DashboardInput name="name" defaultValue={p?.name ?? ""} maxLength={200} placeholder="Name" />
          </DashboardField>
          <DashboardField label="Name in Nepali" help="Shown under the English name on the product page. Leave blank if it isn't needed." example="फोटो फ्रेम">
            <DashboardInput name="name_ne" lang="ne" defaultValue={p?.name_ne ?? ""} maxLength={200} placeholder="Name in Nepali (optional)" />
          </DashboardField>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <DashboardField
            label="Slug"
            help="The end of the product page's address: lowercase words joined by hyphens. Leave blank to make one from the name. Changing a published product's slug adds a redirect from the old address."
            example="walnut-photo-frame"
            hint={p ? `Now ${routes.product(p.slug)}` : "Blank: made from the name."}
          >
            <DashboardInput name="slug" defaultValue={p?.slug ?? ""} maxLength={120} placeholder="Slug (optional)" spellCheck={false} autoCapitalize="off" autoComplete="off" className="font-mono" />
          </DashboardField>
          <CategoryField categories={categories} defaultValue={p?.category_id ?? null} />
        </div>
        <DashboardField label="Summary" required help="One or two sentences for the product's card, Google and link previews." example="A solid walnut frame for 8×10 in prints, with glass and a stand.">
          <DashboardTextarea name="summary" rows={2} maxLength={400} defaultValue={p?.summary ?? ""} placeholder="Summary" />
        </DashboardField>
        <DashboardField
          label="Highlights"
          help={`Short selling points, shown as a list near the price (up to ${PRODUCT_LIMITS.highlights}).`}
          example="Solid walnut, hand finished"
          hint="One per line."
        >
          <DashboardTextarea name="highlights" rows={4} defaultValue={(p?.highlights ?? []).join("\n")} placeholder="One highlight per line (optional)" />
        </DashboardField>
        <MdxField
          name="description"
          label="Description"
          collection="products"
          toc={false}
          defaultValue={p?.description ?? ""}
          help="The full description under the photos, in Markdown: ## for a heading, **bold**, - for a list, <Ne>…</Ne> around Nepali words."
        />
      </FieldGroup>

      <FieldGroup title="Photos" description="The first photo is the main one: the shop's card, the product page and shared links use it.">
        <ImageGalleryField
          name="images"
          label="Product photos"
          collection="products"
          defaultValue={images}
          max={PRODUCT_LIMITS.photos}
          help="Choose photos from the library or upload new ones. Use the arrows to change the order, and describe each photo for people who can't see it and for search engines. Needed before publishing."
          hint={`Up to ${PRODUCT_LIMITS.photos} photos. Large photos also get a zoom size for the product page.`}
        />
      </FieldGroup>

      <FieldGroup title="Price & stock" description="With variants (below), each variant can have its own price and stock.">
        <div className="grid gap-5 md:grid-cols-3">
          <DashboardField label="Price" required help="What the customer pays for one, in the currency chosen. Digits only; commas are fine." example="1500">
            <DashboardInput name="price" inputMode="decimal" defaultValue={moneyText(p?.price)} maxLength={20} placeholder="Price" autoComplete="off" />
          </DashboardField>
          <DashboardField
            label="Usual price"
            help="The price before a discount. When it's higher than the price, the shop shows it struck through with the percentage off. Leave blank when there's no discount."
            example="1800"
          >
            <DashboardInput name="compare_at_price" inputMode="decimal" defaultValue={moneyText(p?.compare_at_price)} maxLength={20} placeholder="Usual price (optional)" autoComplete="off" />
          </DashboardField>
          <DashboardField label="Currency" help="NPR (Nepali rupees) for most products. Prices show as “Rs. 1,500”.">
            <DashboardSelect name="currency" defaultValue={currency}>
              {knownCurrency ? null : <option value={currency}>{currency} (set outside the dashboard)</option>}
              {CURRENCIES.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </DashboardSelect>
          </DashboardField>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <DashboardField label="SKU" help="Your own stock code, if you use one. Shown in the product's specifications." example="FRM-WAL-8X10">
            <DashboardInput name="sku" defaultValue={p?.sku ?? ""} maxLength={100} placeholder="SKU (optional)" spellCheck={false} autoCapitalize="characters" autoComplete="off" />
          </DashboardField>
          <DashboardField label="Stock" help="What the shop says about availability. Out of stock products can't be ordered. With variants, each variant's own stock is used.">
            <DashboardSelect name="stock_status" defaultValue={p?.stock_status ?? "in_stock"}>
              {STOCK_CHOICES.map((choice) => (
                <option key={choice.value} value={choice.value}>
                  {choice.label}
                </option>
              ))}
            </DashboardSelect>
          </DashboardField>
          <DashboardField
            label="Stock quantity"
            help="How many you have, if you count them: an order can't ask for more than this. When you run out, set Stock to Out of stock. Leave blank if you don't count. Not used when the product has variants."
            example="12"
          >
            <DashboardInput name="stock_quantity" type="number" inputMode="numeric" min={0} step={1} defaultValue={p?.stock_quantity ?? ""} placeholder="Quantity (optional)" />
          </DashboardField>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <DashboardField label="Minimum per order" help="The smallest quantity one order can ask for." example="1">
            <DashboardInput name="min_order_quantity" type="number" inputMode="numeric" min={1} max={PRODUCT_LIMITS.quantity} step={1} defaultValue={p?.min_order_quantity ?? 1} />
          </DashboardField>
          <DashboardField label="Maximum per order" help={`The most one order can ask for. Leave blank for no limit (an order can ask for up to ${PRODUCT_LIMITS.quantity}).`} example="10">
            <DashboardInput
              name="max_order_quantity"
              type="number"
              inputMode="numeric"
              min={1}
              max={PRODUCT_LIMITS.quantity}
              step={1}
              defaultValue={p?.max_order_quantity ?? ""}
              placeholder="No limit"
            />
          </DashboardField>
        </div>
      </FieldGroup>

      <FieldGroup title="Options & variants" description="For products that come in sizes, colours or frames. Leave empty for a product sold as it is.">
        <VariantsEditor
          defaultOptions={p?.options ?? []}
          defaultVariants={variants}
          defaultPhotos={images.map((image) => ({ src: image.src, alt: image.alt ?? "", blurDataURL: image.blurDataURL ?? "" }))}
          photosField="images"
        />
      </FieldGroup>

      <FieldGroup title="Specifications" description="Shown as a table on the product page, with the SKU and category added.">
        <RepeatableField
          name="specifications"
          label="Rows"
          help="Facts a buyer checks, one per row: a name and its value. Leave this empty if there's nothing to add."
          example="Material: Walnut wood"
          itemLabel="Specification"
          max={PRODUCT_LIMITS.specifications}
          columns={[
            { key: "label", label: "Name", placeholder: "e.g. Material", maxLength: 80 },
            { key: "value", label: "Value", placeholder: "e.g. Walnut wood", maxLength: 300 },
          ]}
          defaultValue={p?.specifications ?? []}
          addLabel="Add a specification"
        />
      </FieldGroup>

      <FieldGroup title="Delivery & warranty">
        <div className="grid gap-5 md:grid-cols-2">
          <DashboardField
            label="Delivery"
            help="How the product reaches the customer and roughly when. Leave blank to show “Ask us about delivery and pickup.”"
            example="Pickup at the studio, or delivery by courier."
          >
            <DashboardTextarea name="delivery_info" rows={3} maxLength={1000} defaultValue={p?.delivery_info ?? ""} placeholder="Delivery (optional)" />
          </DashboardField>
          <DashboardField label="Warranty & returns" help="Any guarantee, and whether it can be returned or exchanged. Leave blank to show “Ask us.”">
            <DashboardTextarea name="warranty_info" rows={3} maxLength={1000} defaultValue={p?.warranty_info ?? ""} placeholder="Warranty & returns (optional)" />
          </DashboardField>
        </div>
      </FieldGroup>

      <FieldGroup title="Visibility">
        <div className="grid items-end gap-x-5 gap-y-2 md:grid-cols-3">
          <DashboardCheckbox name="published" label="Published" defaultChecked={p?.published ?? false} hint="In the shop. Unticked: a draft only you can see." />
          <DashboardCheckbox name="featured" label="Featured" defaultChecked={p?.featured ?? false} hint="One of the shop's main products." />
          <DashboardField label="Sort order" help="Lower numbers come first in the shop. The arrows on the products list set it for you." example="10">
            <DashboardInput name="sort_order" type="number" inputMode="numeric" step={1} defaultValue={p?.sort_order ?? defaultSortOrder} />
          </DashboardField>
        </div>
      </FieldGroup>

      <SeoFieldset
        defaults={{ seo_title: p?.seo_title ?? "", seo_description: p?.seo_description ?? "", og_image: p?.og_image ?? null }}
        collection="products"
        titlePlaceholder={p?.name || undefined}
        descriptionPlaceholder={p?.summary || undefined}
      />
    </DashboardForm>
  );
}
