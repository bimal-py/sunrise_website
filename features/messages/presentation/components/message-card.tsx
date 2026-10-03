import { ArrowUpRight, Mail, Phone } from "lucide-react";
import { whatsappUrl } from "@/lib/config/site";
import { routes } from "@/lib/routes";
import type { MessageRow } from "@/lib/supabase/types";
import { formatDateTime } from "@/lib/utils/date";
import { toWhatsappNumber } from "@/lib/utils/phone";
import { formatPrice } from "@/features/merchandise/domain/entities";
import { messageStatuses } from "@/features/messages/domain/entities";
import { DashboardButton } from "@/features/dashboard/presentation/components/ui/dashboard-button";
import { DashboardSubmitButton } from "@/features/dashboard/presentation/components/ui/dashboard-submit-button";
import { DashboardCard, DashboardField, DashboardSelect, fieldLabelClass, StatusBadge } from "@/features/dashboard/presentation/components/ui/dashboard-ui";
import { deleteMessage, setMessageStatus } from "@/features/messages/presentation/actions/manage";
import { messageSubject } from "@/features/messages/presentation/message-subject";
import { WhatsAppIcon } from "@/shared/components/brand/social-icons";

const statusLabel = (status: string) => messageStatuses.find((entry) => entry.value === status)?.label ?? status;

/** The order's details in a nested box: product (linked), option, quantity × price = total, delivery address. */
function OrderDetails({ message }: { message: MessageRow }) {
  const quantity = message.quantity ?? 1;
  const currency = message.currency || "NPR";
  const price = message.unit_price;
  return (
    <div className="mt-5 rounded-card border border-line-strong bg-raised p-4">
      <p className={fieldLabelClass}>Order</p>
      <dl className="mt-3 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        <div className="min-w-0">
          <dt className="text-xs text-muted">Product</dt>
          <dd className="mt-0.5 break-words text-strong">
            {message.product_slug ? (
              <a
                href={routes.product(message.product_slug)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
              >
                {message.product_name || message.product_slug}
                <ArrowUpRight size={14} aria-hidden />
                <span className="sr-only">(opens the product page)</span>
              </a>
            ) : (
              message.product_name || "Not recorded"
            )}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-muted">Option</dt>
          <dd className="mt-0.5 break-words text-strong">{message.variant_label || "None"}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-muted">Quantity × price</dt>
          <dd className="mt-0.5 text-strong">
            {price !== null ? (
              <>
                {quantity} × {formatPrice(price, currency)} = <span className="font-semibold text-primary">{formatPrice(price * quantity, currency)}</span>
              </>
            ) : (
              <>{quantity} (price not recorded)</>
            )}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-muted">Deliver to</dt>
          <dd className="mt-0.5 whitespace-pre-wrap break-words text-strong">{message.address || "Not given"}</dd>
        </div>
      </dl>
    </div>
  );
}

/**
 * One message, as on the portfolio's inbox: what it's about with its status, who sent it,
 * the status form (Update) on the right, the order (for orders), the message itself and when
 * it came, then the ways to reply and Delete.
 */
export function MessageCard({ message, studioName }: { message: MessageRow; studioName: string }) {
  const subject = messageSubject(message);
  const wa = toWhatsappNumber(message.phone);
  const about = message.kind === "order" ? `your order for ${message.product_name || "our product"}` : message.occasion && message.occasion !== "Something else" ? `your ${message.occasion.toLowerCase()} enquiry` : "your message";
  const greeting = `Hello ${message.name}, this is ${studioName}. Thank you for ${about}.`;
  const meta = [message.event_date && `Date: ${message.event_date}`, message.place && `Place: ${message.place}`].filter(Boolean).join(" · ");
  const contact = [message.name, message.phone, message.email].filter(Boolean);

  return (
    <DashboardCard className="p-5 sm:p-6">
      <article aria-label={`${subject}, from ${message.name}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="break-words font-display text-2xl font-semibold leading-tight text-strong">{subject}</h2>
              <StatusBadge status={message.status}>{statusLabel(message.status)}</StatusBadge>
              {message.kind === "order" ? <StatusBadge tone="neutral">Order</StatusBadge> : null}
            </div>
            <p className="mt-2 break-words text-base text-muted">{contact.join(" • ")}</p>
            {meta ? <p className="mt-1 text-sm text-muted">{meta}</p> : null}
          </div>

          <form action={setMessageStatus} className="flex items-end gap-3">
            <input type="hidden" name="id" value={message.id} />
            <DashboardField label="Status">
              <DashboardSelect name="status" defaultValue={message.status} className="min-w-32">
                {messageStatuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </DashboardSelect>
            </DashboardField>
            <DashboardSubmitButton pendingLabel="Updating…">Update</DashboardSubmitButton>
          </form>
        </div>

        {message.kind === "order" ? <OrderDetails message={message} /> : null}

        {message.message ? <p className="mt-5 whitespace-pre-wrap break-words text-base leading-8 text-muted">{message.message}</p> : null}

        <p className="mt-5 text-xs uppercase tracking-[0.18em] text-muted">
          Received <time dateTime={message.created_at}>{formatDateTime(message.created_at)}</time>
          {message.updated_at !== message.created_at ? (
            <>
              {" "}
              / Updated <time dateTime={message.updated_at}>{formatDateTime(message.updated_at)}</time>
            </>
          ) : null}
          {message.source_path ? (
            <>
              {" "}
              / From <span className="normal-case tracking-normal">{message.source_path}</span>
            </>
          ) : null}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-line pt-4">
          {wa ? (
            <DashboardButton href={whatsappUrl(wa, greeting)}>
              <WhatsAppIcon className="h-4 w-4" /> Reply on WhatsApp
            </DashboardButton>
          ) : null}
          {message.phone ? (
            <DashboardButton href={`tel:${message.phone.replace(/[^\d+]/g, "")}`} external newTab={false}>
              <Phone size={15} aria-hidden /> Call
            </DashboardButton>
          ) : null}
          {message.email ? (
            <DashboardButton href={`mailto:${message.email}?subject=${encodeURIComponent(`Your ${message.kind === "order" ? "order" : "enquiry"} to ${studioName}`)}`} external newTab={false}>
              <Mail size={15} aria-hidden /> Email
            </DashboardButton>
          ) : null}
          <form action={deleteMessage} className="ml-auto">
            <input type="hidden" name="id" value={message.id} />
            <DashboardButton
              type="submit"
              variant="danger"
              confirm={{ title: `Delete the message from ${message.name}?`, message: "It's removed for good. This can't be undone.", confirmLabel: "Delete" }}
            >
              Delete
            </DashboardButton>
          </form>
        </div>
      </article>
    </DashboardCard>
  );
}
