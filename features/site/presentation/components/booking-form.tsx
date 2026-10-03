"use client";

import { useActionState, useContext, useEffect, useRef } from "react";
import { FormPendingContext, keepValuesOnSubmit } from "@/shared/hooks/use-keep-values-submit";
import { useFormStatus } from "react-dom";
import { CircleCheck, Loader2 } from "lucide-react";
import { whatsappUrl } from "@/lib/config/site";
import { occasions } from "@/features/messages/domain/entities";
import { submitEnquiry, type EnquiryState } from "@/features/messages/presentation/actions/enquiry";
import { WhatsAppIcon } from "@/shared/components/brand/social-icons";
import { doneProgress, startProgress } from "@/shared/components/navigation/progress-store";
import { SpriteButton } from "@/shared/components/ui/sprite-button";

const field = "h-11 w-full rounded-control border border-line-strong bg-raised px-3 text-[15px] text-strong placeholder:text-muted/70 focus:border-primary focus:outline-none aria-[invalid=true]:border-error";
const label = "mb-2 block text-sm font-medium text-strong";
const initial: EnquiryState = { status: "idle" };

function SendButton() {
  const ownPending = useContext(FormPendingContext);
  const pending = useFormStatus().pending || ownPending;
  // The gold bar at the top of the window while the enquiry is on its way.
  useEffect(() => {
    if (!pending) return;
    startProgress();
    return doneProgress;
  }, [pending]);
  return (
    <SpriteButton type="submit" disabled={pending}>
      {pending ? (
        <>
          <Loader2 size={15} className="animate-spin" aria-hidden /> Sending…
        </>
      ) : (
        "Send enquiry"
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

/**
 * Booking enquiry: saved for the studio (dashboard → Messages) through a server action,
 * so it works without JavaScript too. WhatsApp stays one tap away, before and after.
 */
export function BookingForm({ studioName, whatsapp }: { studioName: string; whatsapp: string }) {
  const [state, action, pending] = useActionState(submitEnquiry, initial);
  const startedAt = useRef<HTMLInputElement>(null);
  // When the visitor started filling the form in: a bot posting instantly is ignored.
  useEffect(() => {
    if (startedAt.current) startedAt.current.value = String(Date.now());
  }, [state]);

  const v = state.values ?? {};
  const errors = state.fieldErrors ?? {};
  const chat = whatsapp ? whatsappUrl(whatsapp, `Hello ${studioName}, I'd like to ask about booking.`) : "";

  if (state.status === "success") {
    return (
      <div className="rounded-panel border border-line bg-surface p-6 sm:p-8" role="status">
        <CircleCheck className="h-8 w-8 text-primary" aria-hidden />
        <h2 className="mt-4 text-[30px]">Thank you, we&apos;ve got your message</h2>
        <p className="mt-2 text-muted">We&apos;ll reply on WhatsApp or by phone, usually the same day. If it&apos;s urgent, message us now as well.</p>
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
    <FormPendingContext value={pending}>
    <form action={action} onSubmit={keepValuesOnSubmit(action)} noValidate className="rounded-panel border border-line bg-surface p-6 sm:p-8">
      <h2 className="text-[30px]">Send an enquiry</h2>
      <p className="mt-2 text-sm text-muted">Tell us the occasion, the date and the place. We&apos;ll reply on WhatsApp or by phone.</p>

      {/* Bots fill in every field; people never see this one. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="bf-company">Company</label>
        <input id="bf-company" name="company" tabIndex={-1} autoComplete="off" />
      </div>
      <input ref={startedAt} type="hidden" name="startedAt" />

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="bf-name" className={label}>
            Your name
          </label>
          <input id="bf-name" name="name" autoComplete="name" required maxLength={100} defaultValue={v.name} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "bf-name-error" : undefined} className={field} />
          <FieldError id="bf-name-error" error={errors.name} />
        </div>
        <div>
          <label htmlFor="bf-phone" className={label}>
            Phone or WhatsApp
          </label>
          <input id="bf-phone" name="phone" type="tel" autoComplete="tel" required maxLength={40} placeholder="98XXXXXXXX" defaultValue={v.phone} aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? "bf-phone-error" : undefined} className={field} />
          <FieldError id="bf-phone-error" error={errors.phone} />
        </div>
        <div>
          <label htmlFor="bf-occasion" className={label}>
            What for
          </label>
          <select id="bf-occasion" name="occasion" defaultValue={v.occasion ?? occasions[0]} className={field}>
            {occasions.map((occasion) => (
              <option key={occasion}>{occasion}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="bf-email" className={label}>
            Email <span className="font-normal text-muted">(optional)</span>
          </label>
          <input id="bf-email" name="email" type="email" autoComplete="email" maxLength={200} defaultValue={v.email} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "bf-email-error" : undefined} className={field} />
          <FieldError id="bf-email-error" error={errors.email} />
        </div>
        <div>
          <label htmlFor="bf-date" className={label}>
            Date <span className="font-normal text-muted">(if you know it)</span>
          </label>
          <input id="bf-date" name="date" maxLength={60} placeholder="e.g. 12 Mangsir" defaultValue={v.date} className={field} />
        </div>
        <div>
          <label htmlFor="bf-place" className={label}>
            Place or venue
          </label>
          <input id="bf-place" name="place" maxLength={120} placeholder="e.g. Panchamul" defaultValue={v.place} className={field} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="bf-message" className={label}>
            Anything else
          </label>
          <textarea
            id="bf-message"
            name="message"
            rows={4}
            maxLength={2000}
            placeholder="Photos, a film or both? Both sides of the wedding? An album?"
            defaultValue={v.message}
            className={`${field} h-auto py-2.5`}
          />
        </div>
      </div>

      {state.status === "error" && state.message && (
        <p className="mt-5 text-sm text-error" role="alert">
          {state.message}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <SendButton />
        {chat && (
          <SpriteButton href={chat} variant="secondary">
            <WhatsAppIcon className="h-4 w-4" /> WhatsApp us instead
          </SpriteButton>
        )}
      </div>
      <p className="mt-4 text-xs text-muted">We keep your message only to reply to you. See our privacy notice.</p>
    </form>
    </FormPendingContext>
  );
}
