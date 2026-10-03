import { formatDate } from "@/lib/utils/date";
import { DashboardButton } from "./ui/dashboard-button";
import { DashboardResourceActions } from "./ui/dashboard-resource-actions";
import { DashboardCard, DashboardEmptyState, StatusBadge } from "./ui/dashboard-ui";
import { ReorderButtons } from "./ui/reorder-buttons";

/** One service or print as its list row shows it. */
export type OfferingRow = {
  id: string;
  slug: string;
  name: string;
  name_ne: string;
  summary: string;
  published: boolean;
  featured: boolean;
  sort_order: number;
  updated_at: string;
  created_at: string;
  /** An extra badge, e.g. "On the line: Album". */
  note?: string;
};

// ---------------------------------------------------------------------------------------------
// Filters (View / Sort by / Order), read from the page's search params
// ---------------------------------------------------------------------------------------------

export const OFFERING_VIEWS = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "featured", label: "Featured" },
] as const;
export const OFFERING_SORTS = [
  { value: "sort_order", label: "Sort order" },
  { value: "updated_at", label: "Updated date" },
  { value: "name", label: "Name" },
] as const;
export const ORDERS = [
  { value: "asc", label: "Ascending" },
  { value: "desc", label: "Descending" },
] as const;

type View = (typeof OFFERING_VIEWS)[number]["value"];
type Sort = (typeof OFFERING_SORTS)[number]["value"];
export type OfferingListQuery = { view: View; sort: Sort; order: "asc" | "desc" };

const param = (params: Record<string, string | string[] | undefined>, key: string) => {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
};

export function parseOfferingListQuery(params: Record<string, string | string[] | undefined>): OfferingListQuery {
  const view = OFFERING_VIEWS.find((option) => option.value === param(params, "view"))?.value ?? "all";
  const sort = OFFERING_SORTS.find((option) => option.value === param(params, "sort"))?.value ?? "sort_order";
  const order = param(params, "order");
  return { view, sort, order: order === "asc" || order === "desc" ? order : sort === "updated_at" ? "desc" : "asc" };
}

/** The rows the filters keep, in the order they ask for (the full list arrives in the site's order). */
export function applyOfferingListQuery<T extends OfferingRow>(rows: T[], query: OfferingListQuery): T[] {
  const kept = rows.filter((row) => (query.view === "published" ? row.published : query.view === "draft" ? !row.published : query.view === "featured" ? row.featured : true));
  if (query.sort === "sort_order" && query.order === "asc") return kept;
  const direction = query.order === "asc" ? 1 : -1;
  return kept.toSorted((a, b) => {
    const difference =
      query.sort === "name"
        ? a.name.localeCompare(b.name, "en", { sensitivity: "base" })
        : query.sort === "updated_at"
          ? Date.parse(a.updated_at) - Date.parse(b.updated_at)
          : a.sort_order - b.sort_order || Date.parse(a.created_at) - Date.parse(b.created_at);
    return difference * direction;
  });
}

/** The arrows only make sense on the whole list in the site's order. */
export const canReorder = (query: OfferingListQuery) => query.view === "all" && query.sort === "sort_order" && query.order === "asc";

export function offeringFilterFields(query: OfferingListQuery) {
  return [
    { name: "view", label: "View", options: [...OFFERING_VIEWS], defaultValue: query.view },
    { name: "sort", label: "Sort by", options: [...OFFERING_SORTS], defaultValue: query.sort },
    { name: "order", label: "Order", options: [...ORDERS], defaultValue: query.order },
  ];
}

// ---------------------------------------------------------------------------------------------
// The list
// ---------------------------------------------------------------------------------------------

/**
 * Services or prints as the portfolio lists its projects: one card per item with its name,
 * badges, address, Nepali name, summary and dates, then Edit / Preview / Delete (and the
 * move arrows when the list is in the site's order).
 */
export function OfferingList({
  rows,
  kind,
  publicPath,
  editPath,
  deleteAction,
  moveAction,
  emptyTitle,
  emptyText,
}: {
  rows: OfferingRow[];
  kind: "services" | "prints";
  publicPath: (slug: string) => string;
  editPath: (id: string) => string;
  deleteAction: (formData: FormData) => Promise<void>;
  /** Shows the up/down arrows (only for the whole list in the site's order). */
  moveAction?: (formData: FormData) => Promise<void>;
  emptyTitle: string;
  emptyText: string;
}) {
  if (rows.length === 0) return <DashboardEmptyState title={emptyTitle}>{emptyText}</DashboardEmptyState>;
  const back = kind === "services" ? "the services page" : "the prints page";
  return (
    <section className="grid gap-6" aria-label={kind === "services" ? "Services" : "Prints"}>
      {rows.map((row, index) => (
        <DashboardCard key={row.id} className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 max-w-3xl">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="break-words font-display text-2xl font-semibold leading-tight text-strong">{row.name}</h2>
                {row.featured ? <StatusBadge status="Featured" /> : null}
                <StatusBadge status={row.published ? "Published" : "Draft"} />
                {row.note ? <StatusBadge tone="neutral">{row.note}</StatusBadge> : null}
              </div>
              <p className="mt-1 break-all font-mono text-xs text-muted">{publicPath(row.slug)}</p>
              {row.name_ne ? (
                <p lang="ne" className="mt-2 text-sm text-foreground">
                  {row.name_ne}
                </p>
              ) : null}
              {row.summary ? <p className="mt-4 text-base leading-8 text-muted">{row.summary}</p> : null}
              <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
                Updated {formatDate(row.updated_at)} / Sort order {row.sort_order}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              {moveAction ? <ReorderButtons action={moveAction} id={row.id} name={row.name} isFirst={index === 0} isLast={index === rows.length - 1} /> : null}
              <DashboardResourceActions
                editHref={editPath(row.id)}
                previewHref={row.published ? publicPath(row.slug) : undefined}
                deleteAction={deleteAction}
                deleteFields={{ id: row.id }}
                deleteConfirm={{
                  title: `Delete “${row.name}”?`,
                  message: `Its page comes off the site and its address sends visitors to ${back}. This can't be undone; setting its Status to Draft hides it instead.`,
                }}
              >
                {row.published ? null : (
                  <DashboardButton href={publicPath(row.slug)} disabled title="Drafts aren't on the site: publish it to preview its page">
                    Preview
                  </DashboardButton>
                )}
              </DashboardResourceActions>
            </div>
          </div>
        </DashboardCard>
      ))}
    </section>
  );
}
