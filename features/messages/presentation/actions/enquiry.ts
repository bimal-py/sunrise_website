"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { after } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { notifyNewEnquiry } from "@/lib/email/notify";
import { MESSAGE_LIMITS, occasions } from "@/features/messages/domain/entities";

export type EnquiryField = "name" | "phone" | "email";

export type EnquiryState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<EnquiryField, string>>;
  /** What was typed, so a failed send never empties the form. */
  values?: Record<string, string>;
};

const RATE_WINDOW_MINUTES = 10;
const RATE_MAX = 3;
const MIN_FILL_MS = 2500;

function text(formData: FormData, key: string, max: number): string {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

/** Salted hash of the sender's IP: enough to rate-limit, useless to identify anyone. */
async function ipHash(): Promise<string | null> {
  const list = await headers();
  const ip = list.get("x-forwarded-for")?.split(",")[0]?.trim() || list.get("x-real-ip") || "";
  const salt = process.env.CONTACT_HASH_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!ip || !salt) return null;
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

/**
 * The contact page's enquiry form. Validates, drops bots quietly (a hidden "company" field
 * and a minimum fill time), allows a few messages per sender per ten minutes, then stores
 * the enquiry with the server's secret key (visitors can't read or write the table).
 */
export async function submitEnquiry(_prev: EnquiryState, formData: FormData): Promise<EnquiryState> {
  const values = {
    name: text(formData, "name", MESSAGE_LIMITS.name),
    phone: text(formData, "phone", MESSAGE_LIMITS.phone),
    email: text(formData, "email", MESSAGE_LIMITS.email),
    occasion: text(formData, "occasion", MESSAGE_LIMITS.occasion),
    date: text(formData, "date", MESSAGE_LIMITS.eventDate),
    place: text(formData, "place", MESSAGE_LIMITS.place),
    message: text(formData, "message", MESSAGE_LIMITS.message),
  };

  // Bots fill every field and post instantly; tell them it worked and store nothing.
  const startedAt = Number(formData.get("startedAt"));
  if (String(formData.get("company") ?? "").trim() || (startedAt && Date.now() - startedAt < MIN_FILL_MS)) {
    return { status: "success" };
  }

  const fieldErrors: EnquiryState["fieldErrors"] = {};
  if (!values.name) fieldErrors.name = "Please tell us your name.";
  if (!values.phone) fieldErrors.phone = "Please add a phone or WhatsApp number so we can reply.";
  else if (values.phone.replace(/\D/g, "").length < 7) fieldErrors.phone = "That number looks too short.";
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) fieldErrors.email = "That email address doesn't look right.";
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: "Please check the highlighted fields.", fieldErrors, values };
  }

  const db = adminClient();
  if (!db) {
    return { status: "error", message: "The form isn't working right now. Please send your message on WhatsApp instead.", values };
  }

  const hash = await ipHash();
  if (hash) {
    const since = new Date(Date.now() - RATE_WINDOW_MINUTES * 60_000).toISOString();
    const { count } = await db.from("messages").select("id", { count: "exact", head: true }).eq("ip_hash", hash).gte("created_at", since);
    if ((count ?? 0) >= RATE_MAX) {
      return { status: "error", message: "We've received several messages from you just now. Please wait a few minutes, or message us on WhatsApp.", values };
    }
  }

  const occasion = (occasions as readonly string[]).includes(values.occasion) ? values.occasion : "Something else";
  const userAgent = ((await headers()).get("user-agent") ?? "").slice(0, 400);
  const { error } = await db.from("messages").insert({
    name: values.name,
    phone: values.phone,
    email: values.email,
    occasion,
    event_date: values.date,
    place: values.place,
    message: values.message,
    source_path: "/contact",
    ip_hash: hash,
    user_agent: userAgent,
  });
  if (error) {
    console.error("[enquiry] insert failed", error.message);
    return { status: "error", message: "Something went wrong sending your message. Please try again, or message us on WhatsApp.", values };
  }

  // Email the studio after the response is sent (only when an email service is set up).
  after(() => notifyNewEnquiry({ ...values, occasion }));
  return { status: "success" };
}
