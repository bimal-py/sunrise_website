"use client";

import { useState, type FormEvent } from "react";
import { Mail } from "lucide-react";
import { siteConfig, whatsappUrl } from "@/lib/config/site";
import { WhatsAppIcon } from "@/shared/components/brand/social-icons";
import { SpriteButton } from "@/shared/components/ui/sprite-button";

const occasions = [
  "Wedding",
  "Pre-wedding shoot",
  "Pasni, bratabandha or puja",
  "Studio portraits",
  "Event or programme",
  "Album, frame or prints",
  "Passport or ID photos",
  "Something else",
];

const field = "h-11 w-full rounded-control border border-line-strong bg-raised px-3 text-[15px] text-strong placeholder:text-muted/70 focus:border-primary focus:outline-none";
const label = "mb-2 block text-sm font-medium text-strong";

/**
 * Booking enquiry. Nothing is stored or sent by the site: submitting opens
 * WhatsApp (or the visitor's email app) with the message written out, and the
 * visitor sends it themselves. Replace with a Supabase-backed form later.
 */
export function BookingForm() {
  const [values, setValues] = useState({ name: "", occasion: occasions[0], date: "", place: "", message: "" });
  const set = (key: keyof typeof values) => (event: { target: { value: string } }) => setValues((v) => ({ ...v, [key]: event.target.value }));

  const text = [
    `Hello ${siteConfig.name},`,
    `I'd like to ask about: ${values.occasion}.`,
    values.date && `Date: ${values.date}`,
    values.place && `Place: ${values.place}`,
    values.message,
    values.name && `- ${values.name}`,
  ]
    .filter(Boolean)
    .join("\n");

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    window.open(whatsappUrl(text), "_blank", "noopener,noreferrer");
  };

  const mailto = `mailto:${siteConfig.contact.email}?subject=${encodeURIComponent(`Enquiry: ${values.occasion}`)}&body=${encodeURIComponent(text)}`;

  return (
    <form onSubmit={onSubmit} className="rounded-panel border border-line bg-surface p-6 sm:p-8">
      <h2 className="text-[30px]">Send an enquiry</h2>
      <p className="mt-2 text-sm text-muted">Fill this in and it opens WhatsApp with your message written out. Nothing is saved on this website.</p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="bf-name" className={label}>
            Your name
          </label>
          <input id="bf-name" name="name" autoComplete="name" value={values.name} onChange={set("name")} className={field} />
        </div>
        <div>
          <label htmlFor="bf-occasion" className={label}>
            What for
          </label>
          <select id="bf-occasion" name="occasion" value={values.occasion} onChange={set("occasion")} className={field}>
            {occasions.map((occasion) => (
              <option key={occasion}>{occasion}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="bf-date" className={label}>
            Date <span className="font-normal text-muted">(if you know it)</span>
          </label>
          <input id="bf-date" name="date" placeholder="e.g. 12 Mangsir" value={values.date} onChange={set("date")} className={field} />
        </div>
        <div>
          <label htmlFor="bf-place" className={label}>
            Place or venue
          </label>
          <input id="bf-place" name="place" placeholder="e.g. Panchamul" value={values.place} onChange={set("place")} className={field} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="bf-message" className={label}>
            Anything else
          </label>
          <textarea
            id="bf-message"
            name="message"
            rows={4}
            placeholder="Photos, a film or both? Both sides of the wedding? An album?"
            value={values.message}
            onChange={set("message")}
            className={`${field} h-auto py-2.5`}
          />
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <SpriteButton type="submit">
          <WhatsAppIcon className="h-4 w-4" /> Send on WhatsApp
        </SpriteButton>
        <SpriteButton href={mailto} variant="secondary">
          <Mail className="h-4 w-4" aria-hidden /> Send by email instead
        </SpriteButton>
      </div>
    </form>
  );
}
