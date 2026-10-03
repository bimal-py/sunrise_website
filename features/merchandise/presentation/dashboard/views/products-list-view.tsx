import Link from "next/link";
import { Plus } from "lucide-react";
import { routes } from "@/lib/routes";
import type { ProductCategoryRow } from "@/lib/supabase/types";
import { formatDate } from "@/lib/utils/date";
import { discountPercent, formatPrice } from "@/features/merchandise/domain/entities";
import { DashboardButton } from "@/features/dashboard/presentation/components/ui/dashboard-button";
import { DashboardPageHeader } from "@/features/dashboard/presentation/components/ui/dashboard-page-header";
import { DashboardResourceActions } from "@/features/dashboard/presentation/components/ui/dashboard-resource-actions";
import { DashboardCard, DashboardEmptyState, DashboardNotice, StatusBadge } from "@/features/dashboard/presentation/components/ui/dashboard-ui";
import { DashboardFilterBar } from "@/features/dashboard/presentation/components/ui/filter-bar";
import { Pager } from "@/features/dashboard/presentation/components/ui/pager";
import { ReorderButtons } from "@/features/dashboard/presentation/components/ui/reorder-buttons";
import { SpriteButton } from "@/shared/components/ui/sprite-button";
import { deleteProduct, moveProduct } from "../actions/products";
import { merchandisePaths, STOCK_CHOICES } from "../catalogue-options";
import { PhotoTile } from "../components/photo-tile";
import {
  filterProducts,
  isShopOrder,
  PRODUCTS_PAGE_SIZE,
  productsHref,
  readProductFilters,
  rowPriceRange,
  SORTS,
  STATUS_FILTERS,
  stockBadge,
} from "../product-filters";
import type { ProductListRow } from "../server/catalogue-admin";

type Params = Record<string, string | string[] | undefined>;

const param = (params: Params, key: string) => {
  const value = params[key];
  return ((Array.isArray(value) ? value[0] : value) ?? "").slice(0, 120);
};

/** The select's value for a filter: "" (left out of the address) when it's the default. */
const shown = (value: string, fallback: string) => (value === fallback ? "" : value);

/**
 * Dashboard → Merchandise: the products, as on the portfolio's list pages. A header card with
 * "New product", a filter card, one card per product (photo, name, badges, price, actions),
 * then the pager. Rows move up and down only in the shop's own order with no filters.
 */
export function ProductsListView({ products, categories, params }: { products: ProductListRow[]; categories: ProductCategoryRow[]; params: Params }) {
  const filters = readProductFilters(
    params,
    categories.map((category) => category.slug),
  );
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const matching = filterProducts(products, filters, new Map(categories.map((category) => [category.slug, category.id])));
  const pages = Math.max(1, Math.ceil(matching.length / PRODUCTS_PAGE_SIZE));
  const page = Math.min(filters.page, pages);
  const visible = matching.slice((page - 1) * PRODUCTS_PAGE_SIZE, page * PRODUCTS_PAGE_SIZE);
  const movable = isShopOrder(filters);
  const here = productsHref({ ...filters, page });
  const position = new Map(products.map((product, index) => [product.id, index]));
  const saved = param(params, "saved");
  const deleted = param(params, "deleted");

  return (
    <div className="grid gap-8">
      <DashboardPageHeader
        eyebrow="Merchandise"
        title="Products"
        description="What the studio sells, in the shop's order. Orders from product pages arrive in Messages."
        actions={
          <>
            <DashboardButton href={`${routes.dashboardMessages()}?type=order`}>Orders</DashboardButton>
            <DashboardButton href={merchandisePaths.categories()}>Categories ({categories.length})</DashboardButton>
          </>
        }
        primaryAction={{ href: merchandisePaths.newProduct(), label: "New product", icon: <Plus size={16} aria-hidden /> }}
      />

      {saved ? <DashboardNotice>Saved “{saved}”.</DashboardNotice> : null}
      {deleted ? <DashboardNotice>Deleted “{deleted}”.</DashboardNotice> : null}

      {products.length === 0 ? (
        <DashboardEmptyState
          title="No products yet"
          action={
            <SpriteButton href={merchandisePaths.newProduct()}>
              <Plus size={16} aria-hidden /> New product
            </SpriteButton>
          }
        >
          Add the first thing the studio sells, like a frame or an album. Customers order from its page, and each order arrives in Messages.
        </DashboardEmptyState>
      ) : (
        <>
          <DashboardFilterBar
            action={merchandisePaths.products()}
            search={{ name: "q", placeholder: "Name, SKU or slug", defaultValue: filters.q }}
            fields={[
              {
                name: "status",
                label: "Status",
                options: STATUS_FILTERS.map((option) => ({ value: shown(option.value, "all"), label: option.label })),
                defaultValue: shown(filters.status, "all"),
              },
              {
                name: "category",
                label: "Category",
                options: [
                  { value: "", label: "All" },
                  ...categories.map((category) => ({ value: category.slug, label: category.name })),
                  { value: "none", label: "No category" },
                ],
                defaultValue: shown(filters.category, "all"),
              },
              {
                name: "stock",
                label: "Stock",
                options: [{ value: "", label: "All" }, ...STOCK_CHOICES.map((choice) => ({ value: choice.value, label: choice.short }))],
                defaultValue: shown(filters.stock, "all"),
              },
              {
                name: "sort",
                label: "Sort",
                options: SORTS.map((option) => ({ value: shown(option.value, "order"), label: option.label })),
                defaultValue: shown(filters.sort, "order"),
              },
            ]}
          />

          <p className="-mt-3 text-sm leading-6 text-muted">
            {movable ? (
              `${products.length} product${products.length === 1 ? "" : "s"}, in the shop's order. Use the arrows to move one up or down.`
            ) : (
              <>
                {matching.length} of {products.length} products match.{" "}
                {products.length > 1 && matching.length > 0 ? (
                  <>
                    To move products up or down,{" "}
                    <Link href={merchandisePaths.products()} className="text-primary underline-offset-4 hover:underline">
                      show them all in the shop&apos;s order
                    </Link>
                    .
                  </>
                ) : null}
              </>
            )}
          </p>

          {visible.length === 0 ? (
            <DashboardEmptyState title="Nothing matches" action={<DashboardButton href={merchandisePaths.products()}>Clear the filters</DashboardButton>}>
              No product fits these filters{filters.q ? ` and the words “${filters.q}”` : ""}.
            </DashboardEmptyState>
          ) : (
            <section aria-label="Products" className="grid gap-6">
              {visible.map((row) => (
                <ProductRow
                  key={row.id}
                  row={row}
                  category={row.category_id ? (categoryById.get(row.category_id) ?? null) : null}
                  position={position.get(row.id) ?? 0}
                  total={products.length}
                  movable={movable}
                  back={here}
                />
              ))}
            </section>
          )}

          <Pager page={page} total={matching.length} pageSize={PRODUCTS_PAGE_SIZE} href={(to) => productsHref(filters, to)} noun="products" />
        </>
      )}
    </div>
  );
}

function ProductRow({
  row,
  category,
  position,
  total,
  movable,
  back,
}: {
  row: ProductListRow;
  category: ProductCategoryRow | null;
  position: number;
  total: number;
  movable: boolean;
  back: string;
}) {
  const range = rowPriceRange(row);
  const variantCount = row.variants.length;
  const price = Number(row.price);
  const compare = row.compare_at_price === null ? null : Number(row.compare_at_price);
  // The product's own discount applies when there are no variants, or when every variant uses the product's prices.
  const ownPrices = variantCount === 0 || row.variants.every((variant) => variant.price === null && variant.compareAtPrice === null);
  const discount = ownPrices ? discountPercent(price, compare) : null;
  const priceText = range.min !== range.max ? `${formatPrice(range.min, row.currency)} – ${formatPrice(range.max, row.currency)}` : formatPrice(range.min, row.currency);
  const stock = stockBadge(row);
  const details = [
    category ? `${category.name}${category.published ? "" : " (hidden category)"}` : "No category",
    variantCount ? `${variantCount} variant${variantCount === 1 ? "" : "s"}` : null,
    `${row.images.length} photo${row.images.length === 1 ? "" : "s"}`,
  ].filter(Boolean);

  return (
    <DashboardCard className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 max-w-3xl flex-[1_1_18rem] items-start gap-4">
          <PhotoTile image={row.images[0]} alt={row.images[0]?.alt ?? ""} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h2 className="break-words font-display text-2xl font-semibold leading-tight text-strong">{row.name}</h2>
              <StatusBadge status={row.published ? "Published" : "Draft"} />
              {row.featured ? <StatusBadge status="Featured" /> : null}
              <StatusBadge tone={stock.tone}>{stock.label}</StatusBadge>
            </div>
            <p className="mt-1 break-all font-mono text-xs text-muted">{routes.product(row.slug)}</p>
            {row.name_ne ? (
              <p lang="ne" className="mt-1 text-sm text-muted">
                {row.name_ne}
              </p>
            ) : null}
            <p className="mt-3 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <span className="text-lg font-semibold text-strong">{priceText}</span>
              {discount && compare !== null ? (
                <>
                  <s className="text-sm text-muted">{formatPrice(compare, row.currency)}</s>
                  <StatusBadge tone="gold">-{discount}%</StatusBadge>
                </>
              ) : null}
            </p>
            {row.summary ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{row.summary}</p> : null}
            <p className="mt-2 text-sm text-muted">{details.join(" • ")}</p>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
              Updated {formatDate(row.updated_at)} · Sort {row.sort_order}
              {row.sku ? ` · SKU ${row.sku}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {movable && total > 1 ? <ReorderButtons action={moveProduct} id={row.id} isFirst={position === 0} isLast={position === total - 1} name={row.name} /> : null}
          <DashboardResourceActions
            editHref={merchandisePaths.product(row.id)}
            previewHref={row.published ? routes.product(row.slug) : undefined}
            deleteAction={deleteProduct}
            deleteFields={{ id: row.id, back }}
            deleteConfirm={{
              title: `Delete “${row.name}”?`,
              message: row.published
                ? "It leaves the shop, and its address will send visitors to the shop's main page. Orders already received stay in Messages. This can't be undone."
                : "This draft will be removed. This can't be undone.",
            }}
          />
        </div>
      </div>
    </DashboardCard>
  );
}
