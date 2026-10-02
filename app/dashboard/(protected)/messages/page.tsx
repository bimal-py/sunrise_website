import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { whatsappUrl } from "@/lib/config/site";
import { routes } from "@/lib/routes";
import type { MessageStatus } from "@/lib/supabase/types";
import { formatDateTime } from "@/lib/utils/date";
import { toWhatsappNumber } from "@/lib/utils/phone";
import { getSiteSettings } from "@/features/site/data/settings.repository";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { ConfirmSubmit, QuietSubmit } from "@/features/dashboard/presentation/components/form-controls";
import { PageHeader, StatusBadge } from "@/features/dashboard/presentation/components/ui";
import { deleteMessage, markAllRead, setMessageStatus } from "@/features/messages/presentation/actions/manage";
import { WhatsAppIcon } from "@/shared/components/brand/social-icons";
import { EmptyState } from "@/shared/components/ui/empty-state";

export const metadata: Metadata = { title: "Messages" };

const VIEWS = [
  { id: "inbox", label: "Inbox" },
  { id: "new", label: "New" },
  { id: "replied", label: "Replied" },
  { id: "archived", label: "Archived" },
] as const;
type View = (typeof VIEWS)[number]["id"];

const badge: Record<MessageStatus, { tone: "gold" | "green" | "muted"; label: string }> = {
  new: { tone: "gold", label: "New" },
  read: { tone: "muted", label: "Read" },
  replied: { tone: "green", label: "Replied" },
  archived: { tone: "muted", label: "Archived" },
};

const PAGE_SIZE = 25;

const chip = "inline-flex h-9 items-center rounded-control border px-3 text-sm transition-colors duration-150";

type PageProps = { searchParams: Promise<{ status?: string; page?: string }> };

export default async function MessagesPage({ searchParams }: PageProps) {
  const { status, page: pageParam } = await searchParams;
  const view: View = VIEWS.some((v) => v.id === status) ? (status as View) : "inbox";
  const page = Math.max(1, Number.parseInt(pageParam ?? "", 10) || 1);
  const { supabase } = await requireAdmin();

  let query = supabase
    .from("messages")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  query = view === "inbox" ? query.neq("status", "archived") : query.eq("status", view);
  const [{ data: messages, error, count }, site] = await Promise.all([query, getSiteSettings()]);
  if (error) throw new Error(`Couldn't load messages: ${error.message}`);
  const total = count ?? messages.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (to: number) => {
    const params = new URLSearchParams();
    if (view !== "inbox") params.set("status", view);
    if (to > 1) params.set("page", String(to));
    const query = params.toString();
    return query ? `${routes.dashboardMessages()}?${query}` : routes.dashboardMessages();
  };
  const hasNew = messages.some((m) => m.status === "new");

  return (
    <>
      <PageHeader
        eyebrow="Messages"
        title="Enquiries"
        description="Sent from the contact page's form. Reply on WhatsApp or by phone, then mark the message replied."
        actions={
          hasNew ? (
            <form action={markAllRead}>
              <QuietSubmit className="text-primary hover:text-primary-strong">Mark all as read</QuietSubmit>
            </form>
          ) : undefined
        }
      />

      <nav aria-label="Message folders" className="mb-6 flex flex-wrap gap-2">
        {VIEWS.map((v) => (
          <Link
            key={v.id}
            href={v.id === "inbox" ? routes.dashboardMessages() : routes.dashboardMessages(v.id)}
            aria-current={view === v.id ? "page" : undefined}
            className={`${chip} ${view === v.id ? "border-primary bg-primary-soft text-strong" : "border-line-strong text-foreground hover:border-primary"}`}
          >
            {v.label}
          </Link>
        ))}
      </nav>

      {messages.length === 0 ? (
        <EmptyState title={view === "inbox" ? "No messages yet" : "Nothing here"}>
          {view === "inbox" ? "When someone sends the form on the contact page, it appears here." : "Messages you move here will show up in this folder."}
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-4">
          {messages.map((m) => {
            const wa = toWhatsappNumber(m.phone);
            const greeting = `Hello ${m.name}, this is ${site.name}. Thank you for your message${m.occasion ? ` about ${m.occasion.toLowerCase()}` : ""}.`;
            return (
              <li key={m.id} className={`rounded-panel border bg-surface p-5 sm:p-6 ${m.status === "new" ? "border-primary/50" : "border-line"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-lg font-semibold text-strong">{m.name}</p>
                    <p className="mt-0.5 text-sm text-muted">
                      {[m.occasion, m.event_date && `Date: ${m.event_date}`, m.place && `Place: ${m.place}`].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge tone={badge[m.status].tone}>{badge[m.status].label}</StatusBadge>
                    <time dateTime={m.created_at} className="font-mono text-xs text-muted">
                      {formatDateTime(m.created_at)}
                    </time>
                  </div>
                </div>

                {m.message && <p className="mt-4 whitespace-pre-wrap text-foreground">{m.message}</p>}

                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                  {wa && (
                    <a href={whatsappUrl(wa, greeting)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 items-center gap-1.5 text-primary hover:text-primary-strong">
                      <WhatsAppIcon className="h-4 w-4" /> Reply on WhatsApp
                    </a>
                  )}
                  {m.phone && (
                    <a href={`tel:${m.phone.replace(/[^\d+]/g, "")}`} className="inline-flex min-h-8 items-center gap-1.5 text-primary hover:text-primary-strong">
                      <Phone className="h-4 w-4" aria-hidden /> {m.phone}
                    </a>
                  )}
                  {m.email && (
                    <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Your enquiry to ${site.name}`)}`} className="inline-flex min-h-8 items-center gap-1.5 break-all text-primary hover:text-primary-strong">
                      <Mail className="h-4 w-4" aria-hidden /> {m.email}
                    </a>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-line pt-3">
                  {(
                    [
                      m.status === "new" && { status: "read", label: "Mark read" },
                      m.status !== "replied" && m.status !== "archived" && { status: "replied", label: "Mark replied" },
                      m.status !== "archived" && { status: "archived", label: "Archive" },
                      m.status === "archived" && { status: "read", label: "Back to inbox" },
                    ].filter(Boolean) as { status: MessageStatus; label: string }[]
                  ).map((next) => (
                    <form key={next.status} action={setMessageStatus}>
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="status" value={next.status} />
                      <QuietSubmit>{next.label}</QuietSubmit>
                    </form>
                  ))}
                  <form action={deleteMessage} className="ml-auto">
                    <input type="hidden" name="id" value={m.id} />
                    <ConfirmSubmit confirm={`Delete the message from ${m.name}? This can't be undone.`}>Delete</ConfirmSubmit>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {pages > 1 && (
        <nav aria-label="Message pages" className="mt-8 flex items-center justify-between gap-4 border-t border-line pt-5">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="inline-flex min-h-10 items-center text-sm text-primary hover:text-primary-strong">
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          {page < pages ? (
            <Link href={pageHref(page + 1)} className="inline-flex min-h-10 items-center text-sm text-primary hover:text-primary-strong">
              Older →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}
