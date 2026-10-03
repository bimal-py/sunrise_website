import type { Metadata } from "next";
import { routes } from "@/lib/routes";
import type { MessageStatus } from "@/lib/supabase/types";
import { getSiteSettings } from "@/features/site/data/settings.repository";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { DashboardButton } from "@/features/dashboard/presentation/components/ui/dashboard-button";
import { DashboardPageHeader } from "@/features/dashboard/presentation/components/ui/dashboard-page-header";
import { DashboardEmptyState } from "@/features/dashboard/presentation/components/ui/dashboard-ui";
import { DashboardFilterBar } from "@/features/dashboard/presentation/components/ui/filter-bar";
import { Pager } from "@/features/dashboard/presentation/components/ui/pager";
import { markAllRead } from "@/features/messages/presentation/actions/manage";
import { MessageCard } from "@/features/messages/presentation/components/message-card";

export const metadata: Metadata = { title: "Messages" };

const PAGE_SIZE = 25;

/** Status filter: the inbox (everything not archived) unless a status is chosen. "" = the default, left out of the address. */
const STATUS_OPTIONS = [
  { value: "", label: "Inbox (not archived)" },
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "read", label: "Read" },
  { value: "replied", label: "Replied" },
  { value: "archived", label: "Archived" },
];
const TYPE_OPTIONS = [
  { value: "", label: "Enquiries and orders" },
  { value: "enquiry", label: "Enquiries" },
  { value: "order", label: "Orders" },
];
const SORT_OPTIONS = [
  { value: "", label: "Received date" },
  { value: "updated", label: "Updated date" },
];
const ORDER_OPTIONS = [
  { value: "", label: "Newest first" },
  { value: "asc", label: "Oldest first" },
];

type Params = { status?: string | string[]; type?: string | string[]; sort?: string | string[]; order?: string | string[]; q?: string | string[]; page?: string | string[] };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
const pick = (value: string, options: { value: string }[]) => (options.some((option) => option.value === value) ? value : "");

/** Search words, safe inside a PostgREST or() filter (no commas, brackets or wildcards). */
function searchWords(raw: string): string {
  return raw.replace(/[%_*,()\\"':]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export default async function MessagesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const status = pick(first(params.status), STATUS_OPTIONS);
  const type = pick(first(params.type), TYPE_OPTIONS);
  const sort = pick(first(params.sort), SORT_OPTIONS);
  const order = pick(first(params.order), ORDER_OPTIONS);
  const q = searchWords(first(params.q));
  const page = Math.max(1, Number.parseInt(first(params.page), 10) || 1);
  const { supabase } = await requireAdmin();

  let query = supabase.from("messages").select("*", { count: "exact" });
  if (!status) query = query.neq("status", "archived");
  else if (status !== "all") query = query.eq("status", status as MessageStatus);
  if (type === "enquiry" || type === "order") query = query.eq("kind", type);
  if (q) {
    const like = `%${q}%`;
    query = query.or(
      ["name", "phone", "email", "message", "occasion", "place", "product_name", "address"].map((column) => `${column}.ilike.${like}`).join(","),
    );
  }
  query = query
    .order(sort === "updated" ? "updated_at" : "created_at", { ascending: order === "asc" })
    .order("id")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const [{ data: messages, error, count }, site, { count: newCount }] = await Promise.all([
    query,
    getSiteSettings(),
    supabase.from("messages").select("id", { count: "exact", head: true }).eq("status", "new"),
  ]);
  if (error) throw new Error(`Couldn't load messages: ${error.message}`);
  const total = count ?? messages.length;
  const filtered = Boolean(status || type || q);

  const pageHref = (to: number) => {
    const next = new URLSearchParams();
    if (status) next.set("status", status);
    if (type) next.set("type", type);
    if (sort) next.set("sort", sort);
    if (order) next.set("order", order);
    if (q) next.set("q", q);
    if (to > 1) next.set("page", String(to));
    const text = next.toString();
    return text ? `${routes.dashboardMessages()}?${text}` : routes.dashboardMessages();
  };

  return (
    <div className="grid gap-8">
      <DashboardPageHeader
        eyebrow="Messages"
        title="Enquiries and orders."
        description="Enquiries from the contact page and orders from the shop. Filter by status or type, reply on WhatsApp, by phone or email, then set the status."
        actions={
          newCount ? (
            <form action={markAllRead}>
              <DashboardButton type="submit">Mark all as read</DashboardButton>
            </form>
          ) : undefined
        }
      />

      <DashboardFilterBar
        action={routes.dashboardMessages()}
        search={{ name: "q", placeholder: "Name, phone, email or words", defaultValue: q }}
        fields={[
          { name: "status", label: "Status", options: STATUS_OPTIONS, defaultValue: status },
          { name: "type", label: "Type", options: TYPE_OPTIONS, defaultValue: type },
          { name: "sort", label: "Sort by", options: SORT_OPTIONS, defaultValue: sort },
          { name: "order", label: "Order", options: ORDER_OPTIONS, defaultValue: order },
        ]}
      />

      {messages.length === 0 ? (
        <DashboardEmptyState
          title={filtered ? "No messages match" : "No messages yet"}
          action={filtered ? <DashboardButton href={routes.dashboardMessages()}>Show the inbox</DashboardButton> : undefined}
        >
          {filtered
            ? "Try another status, type or search."
            : "Enquiries sent from the contact page and orders from product pages arrive here."}
        </DashboardEmptyState>
      ) : (
        <section aria-label="Messages" className="grid gap-6">
          {messages.map((message) => (
            <MessageCard key={message.id} message={message} studioName={site.name} />
          ))}
        </section>
      )}

      <Pager page={page} total={total} pageSize={PAGE_SIZE} href={pageHref} noun={total === 1 ? "message" : "messages"} />
    </div>
  );
}
