import { Plus } from "lucide-react";
import { routes } from "@/lib/routes";
import type { ProductCategoryRow } from "@/lib/supabase/types";
import { formatDate } from "@/lib/utils/date";
import { DashboardButton } from "@/features/dashboard/presentation/components/ui/dashboard-button";
import { DashboardPageHeader } from "@/features/dashboard/presentation/components/ui/dashboard-page-header";
import { DashboardResourceActions } from "@/features/dashboard/presentation/components/ui/dashboard-resource-actions";
import { DashboardCard, DashboardEmptyState, DashboardNotice, StatusBadge } from "@/features/dashboard/presentation/components/ui/dashboard-ui";
import { ReorderButtons } from "@/features/dashboard/presentation/components/ui/reorder-buttons";
import { SpriteButton } from "@/shared/components/ui/sprite-button";
import { deleteCategory, moveCategory } from "../actions/categories";
import { merchandisePaths } from "../catalogue-options";
import { PhotoTile } from "../components/photo-tile";
import type { CategoryCount } from "../server/catalogue-admin";

type Params = Record<string, string | string[] | undefined>;

const param = (params: Params, key: string) => {
  const value = params[key];
  return ((Array.isArray(value) ? value[0] : value) ?? "").slice(0, 120);
};

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/**
 * Dashboard → Merchandise → Categories: the shop's category filter, in its order. One card
 * per category with its product count, Edit / Preview / Delete and the ↑/↓ arrows.
 */
export function CategoriesListView({ categories, counts, params }: { categories: ProductCategoryRow[]; counts: Map<string, CategoryCount>; params: Params }) {
  const saved = param(params, "saved");
  const deleted = param(params, "deleted");

  return (
    <div className="grid gap-8">
      <DashboardPageHeader
        eyebrow="Merchandise"
        title="Categories"
        description="The groups in the shop's filter, in this order. A category shows in the shop once it's published and has at least one published product."
        actions={<DashboardButton href={merchandisePaths.products()}>← Products</DashboardButton>}
        primaryAction={{ href: merchandisePaths.newCategory(), label: "New category", icon: <Plus size={16} aria-hidden /> }}
      />

      {saved ? <DashboardNotice>Saved “{saved}”.</DashboardNotice> : null}
      {deleted ? <DashboardNotice>Deleted “{deleted}”. Its products are kept, without a category.</DashboardNotice> : null}

      {categories.length === 0 ? (
        <DashboardEmptyState
          title="No categories yet"
          action={
            <SpriteButton href={merchandisePaths.newCategory()}>
              <Plus size={16} aria-hidden /> New category
            </SpriteButton>
          }
        >
          Categories group products in the shop, like “Photo frames” or “Albums”. They&apos;re optional: a shop with a few products works fine without them.
        </DashboardEmptyState>
      ) : (
        <section aria-label="Categories" className="grid gap-6">
          {categories.map((category, index) => {
            const count = counts.get(category.id) ?? { total: 0, published: 0 };
            const live = category.published && count.published > 0;
            return (
              <DashboardCard key={category.id} className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 max-w-3xl flex-[1_1_18rem] items-start gap-4">
                    <PhotoTile image={category.image} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <h2 className="break-words font-display text-2xl font-semibold leading-tight text-strong">{category.name}</h2>
                        <StatusBadge status={category.published ? "Published" : "Draft"} />
                        {category.published && count.published === 0 ? <StatusBadge tone="muted">Not in the shop yet</StatusBadge> : null}
                      </div>
                      <p className="mt-1 break-all font-mono text-xs text-muted">{routes.merchandiseCategory(category.slug)}</p>
                      {category.name_ne ? (
                        <p lang="ne" className="mt-1 text-sm text-muted">
                          {category.name_ne}
                        </p>
                      ) : null}
                      {category.description ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{category.description}</p> : null}
                      <p className="mt-2 text-sm text-muted">
                        {plural(count.total, "product")}
                        {count.total > 0 && count.published !== count.total ? ` (${count.published} published)` : ""}
                      </p>
                      <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                        Updated {formatDate(category.updated_at)} · Sort {category.sort_order}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    {categories.length > 1 ? (
                      <ReorderButtons action={moveCategory} id={category.id} isFirst={index === 0} isLast={index === categories.length - 1} name={category.name} />
                    ) : null}
                    <DashboardResourceActions
                      editHref={merchandisePaths.category(category.id)}
                      previewHref={live ? routes.merchandiseCategory(category.slug) : undefined}
                      deleteAction={deleteCategory}
                      deleteFields={{ id: category.id, back: merchandisePaths.categories() }}
                      deleteConfirm={{
                        title: `Delete “${category.name}”?`,
                        message:
                          count.total > 0
                            ? `Its ${plural(count.total, "product")} ${count.total === 1 ? "is" : "are"} kept, without a category. This can't be undone.`
                            : "It has no products. This can't be undone.",
                      }}
                    />
                  </div>
                </div>
              </DashboardCard>
            );
          })}
        </section>
      )}
    </div>
  );
}
