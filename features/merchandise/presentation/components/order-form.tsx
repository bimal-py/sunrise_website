"use client";

import Link from "next/link";
import { useActionState, useContext, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { CircleCheck, Loader2 } from "lucide-react";
import { whatsappUrl } from "@/lib/config/site";
import { routes } from "@/lib/routes";
import { formatPrice } from "@/features/merchandise/domain/entities";
import { WhatsAppIcon } from "@/shared/components/brand/social-icons";
import { doneProgress, startProgress } from "@/shared/components/navigation/progress-store";
import { SpriteButton } from "@/shared/components/ui/sprite-button";
import { FormPendingContext, keepValuesOnSubmit } from "@/shared/hooks/use-keep-values-submit";
import { submitOrder, type OrderState, type PlacedOrder } from "../actions/order";

const field =
  "h-11 w-full rounded-control border border-line-strong bg-raised px-3 text-[15px] text-strong placeholder:text-muted/70 focus:border-primary focus:outline-none aria-[invalid=true]:border-error";
const label = "mb-2 block text-sm font-medium text-strong";
const initial: OrderState = { status: "idle" };

/** What the buyer is about to order, as the page shows it (the server prices it again). */
export type OrderSummary = { product: string; variant: string; quantity: number; unitPrice: number; currency: string };

const totalOf = (order: { quantity: number; unitPrice: number }) => Math.round(order.quantity * order.unitPrice * 100) / 100;

function SendButton({ disabled }: { disabled: boolean }) {
  const ownPending = useContext(FormPendingContext);
  const pending = useFormStatus().pending || ownPending;
  // The gold bar at the top of the window while the order is on its way.
  useEffect(() => {
    if (!pending) return;
    startProgress();
    return doneProgress;
  }, [pending]);
  return (
    <SpriteButton type="submit" disabled={pending || disabled}>
      {pending ? (
        <>
          <Loader2 size={15} className="animate-spin" aria-hidden /> Sending…
        </>
      ) : (
        "Send order"
      )}
    </SpriteButton>
  );
}

function FieldError({ id, error }: { id: string; error?: string }) {
  return error ? (
    <p id={id} className="mt-1.5 text-sm text-error">
      {error}
    </p>
  ) : null;
}

function orderMessage(studioName: string, order: PlacedOrder): string {
  const what = `${order.quantity} × ${order.product}${order.variant ? ` (${order.variant})` : ""}`;
  return `Hello ${studioName}, I've just sent an order from your website: ${what}, ${formatPrice(totalOf(order), order.currency)}. My name is ${order.name}.`;
}

/**
 * The order form under "Order now": the buyer's name, phone and delivery address (plus an
 * optional email and note), sent with the chosen options and quantity (fields outside the
 * form that point at it with `form=`), so it works without JavaScript too. Orders arrive in
 * the dashboard's Messages; the studio calls to confirm. WhatsApp is offered after sending.
 */
export function OrderForm({
  formId,
  productId,
  open,
  orderable,
  summary,
  studioName,
  whatsapp,
  onCancel,
}: {
  formId: string;
  productId: string;
  open: boolean;
  orderable: boolean;
  summary: OrderSummary;
  studioName: string;
  whatsapp: string;
  onCancel: () => void;
}) {
  const [state, action, pending] = useActionState(submitOrder, initial);
  const startedAt = useRef<HTMLInputElement>(null);
  const firstField = useRef<HTMLInputElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  // When the page loaded: an order posted at once is a bot's, and is quietly dropped.
  useEffect(() => {
    if (startedAt.current && !startedAt.current.value) startedAt.current.value = String(Date.now());
  }, []);

  // Opened: show the form and start typing.
  useEffect(() => {
    if (!open) return;
    firstField.current?.focus({ preventScroll: true });
    panel.current?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
  }, [open]);

  const v = state.values ?? {};
  const errors = state.fieldErrors ?? {};
  const total = totalOf(summary);

  if (state.status === "success") {
    const order = state.order;
    const chat = whatsapp && order ? whatsappUrl(whatsapp, orderMessage(studioName, order)) : "";
    return (
      <div ref={panel} role="status" className="scroll-mt-28 rounded-panel border border-line bg-surface p-6">
        <CircleCheck className="h-8 w-8 text-primary" aria-hidden />
        <h2 className="mt-4 text-[28px]">{order ? `Thank you, ${order.name}!` : "Thank you!"}</h2>
        <p className="mt-2 text-muted">
          We&apos;ve got your order
          {order && (
            <>
              {" "}
              for <span className="text-strong">{`${order.quantity} × ${order.product}`}</span>
              {order.variant && ` (${order.variant})`}, {formatPrice(totalOf(order), order.currency)}
            </>
          )}
          . We&apos;ll contact you soon to confirm it.
        </p>
        {chat && (
          <div className="mt-6">
            <SpriteButton href={chat} variant="secondary">
              <WhatsAppIcon className="h-4 w-4" /> Message us on WhatsApp
            </SpriteButton>
          </div>
        )}
      </div>
    );
  }

  return (
    // Hidden with the class, not the attribute: Tailwind's base layer forces [hidden] off with !important, which
    // the no-JavaScript rule (product-purchase.tsx) couldn't undo.
    <div ref={panel} data-order-form className={`scroll-mt-28 ${open ? "" : "hidden"}`}>
      <FormPendingContext value={pending}>
        <form id={formId} action={action} onSubmit={keepValuesOnSubmit(action)} noValidate className="rounded-panel border border-line bg-surface p-5 sm:p-6">
          <h2 className="text-[28px]">Your order</h2>
          <div className="mt-4 rounded-card border border-line-strong bg-raised p-4 text-sm">
            <p className="text-strong">{`${summary.quantity} × ${summary.product}`}</p>
            {summary.variant && <p className="mt-0.5 text-muted">{summary.variant}</p>}
            <p className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-line pt-3">
              <span className="text-muted">
                {summary.quantity} × {formatPrice(summary.unitPrice, summary.currency)}
              </span>
              <span className="font-semibold tabular-nums text-strong">{formatPrice(total, summary.currency)}</span>
            </p>
          </div>
          <p className="mt-3 text-sm text-muted">Nothing is paid online. We&apos;ll call or message you to confirm your order.</p>

          {/* Bots fill in every field; people never see this one. */}
          <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label htmlFor={`${formId}-company`}>Company</label>
            <input id={`${formId}-company`} name="company" tabIndex={-1} autoComplete="off" />
          </div>
          <input ref={startedAt} type="hidden" name="startedAt" />
          <input type="hidden" name="productId" value={productId} />

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor={`${formId}-name`} className={label}>
                Your name
              </label>
              <input
                ref={firstField}
                id={`${formId}-name`}
                name="name"
                autoComplete="name"
                required
                maxLength={100}
                defaultValue={v.name}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? `${formId}-name-error` : undefined}
                className={field}
              />
              <FieldError id={`${formId}-name-error`} error={errors.name} />
            </div>
            <div>
              <label htmlFor={`${formId}-phone`} className={label}>
                Phone or WhatsApp
              </label>
              <input
                id={`${formId}-phone`}
                name="phone"
                type="tel"
                autoComplete="tel"
                required
                maxLength={40}
                placeholder="98XXXXXXXX"
                defaultValue={v.phone}
                aria-invalid={Boolean(errors.phone)}
                aria-describedby={errors.phone ? `${formId}-phone-error` : undefined}
                className={field}
              />
              <FieldError id={`${formId}-phone-error`} error={errors.phone} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor={`${formId}-address`} className={label}>
                Delivery address or place
              </label>
              <textarea
                id={`${formId}-address`}
                name="address"
                rows={2}
                required
                maxLength={300}
                autoComplete="street-address"
                placeholder="Tole, ward and municipality, or where you'd like to pick it up"
                defaultValue={v.address}
                aria-invalid={Boolean(errors.address)}
                aria-describedby={errors.address ? `${formId}-address-error` : undefined}
                className={`${field} block h-auto py-2.5`}
              />
              <FieldError id={`${formId}-address-error`} error={errors.address} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor={`${formId}-email`} className={label}>
                Email <span className="font-normal text-muted">(optional)</span>
              </label>
              <input
                id={`${formId}-email`}
                name="email"
                type="email"
                autoComplete="email"
                maxLength={200}
                defaultValue={v.email}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? `${formId}-email-error` : undefined}
                className={field}
              />
              <FieldError id={`${formId}-email-error`} error={errors.email} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor={`${formId}-note`} className={label}>
                Anything else <span className="font-normal text-muted">(optional)</span>
              </label>
              <textarea
                id={`${formId}-note`}
                name="note"
                rows={3}
                maxLength={2000}
                placeholder="When you need it, a colour, a message…"
                defaultValue={v.note}
                className={`${field} block h-auto py-2.5`}
              />
            </div>
          </div>

          {!orderable && (
            <p className="mt-5 text-sm text-error" role="alert">
              That choice can&apos;t be ordered right now. Please choose another option above.
            </p>
          )}
          {state.status === "error" && state.message && (
            <p className="mt-5 text-sm text-error" role="alert">
              {state.message}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
            <SendButton disabled={!orderable} />
            <button type="button" onClick={onCancel} className="inline-flex min-h-11 items-center text-sm font-medium text-muted underline-offset-4 hover:text-primary hover:underline">
              Cancel
            </button>
          </div>
          <p className="mt-4 text-xs text-muted">
            We keep your details only to confirm and deliver your order. See our{" "}
            <Link href={routes.privacy()} className="underline underline-offset-2 hover:text-primary">
              privacy notice
            </Link>
            .
          </p>
        </form>
      </FormPendingContext>
    </div>
  );
}
