"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { after } from "next/server";
import { siteUrl } from "@/lib/config/site";
import { routes } from "@/lib/routes";
import { adminClient } from "@/lib/supabase/admin";
import { MESSAGE_LIMITS } from "@/features/messages/domain/entities";
import { rowToProduct } from "@/features/merchandise/data/merchandise.repository";
import { formatPrice, isOrderable, offerFor, type Product } from "@/features/merchandise/domain/entities";
import { optionFieldName, optionGroups, quantityLimits, resolveSelection, selectionLabel, usesVariants } from "../lib/variants";

export type OrderField = "name" | "phone" | "email" | "address";

/** What the studio received, priced on the server (never from the page). */
export type PlacedOrder = { name: string; product: string; variant: string; quantity: number; unitPrice: number; currency: string };

export type OrderState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<OrderField, string>>;
  /** What was typed, so a failed send never empties the form. */
  values?: Record<string, string>;
  order?: PlacedOrder;
};

const RATE_WINDOW_MINUTES = 10;
/** Messages per sender per window, enquiries and orders together (the contact form allows 3 of its own). */
const RATE_MAX = 5;
const MIN_FILL_MS = 2500;
/** messages.address holds up to 300 characters. */
const ADDRESS_MAX = 300;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TRY_AGAIN = "Something went wrong sending your order. Please try again, or message us on WhatsApp.";

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
 * An order from a product page. There's no checkout: the order lands in the dashboard's
 * Messages (kind "order") and the studio contacts the buyer to confirm it. Validates the
 * buyer's details, drops bots quietly (a hidden "company" field and a minimum fill time),
 * re-reads the product, checks the options, quantity and stock against it as it is now and
 * prices the order itself, allows a few messages per sender per ten minutes, then stores the
 * order with the server's secret key (visitors can't read or write the table).
 */
export async function submitOrder(_prev: OrderState, formData: FormData): Promise<OrderState> {
  const values = {
    name: text(formData, "name", MESSAGE_LIMITS.name),
    phone: text(formData, "phone", MESSAGE_LIMITS.phone),
    email: text(formData, "email", MESSAGE_LIMITS.email),
    address: text(formData, "address", ADDRESS_MAX),
    note: text(formData, "note", MESSAGE_LIMITS.message),
  };

  // Bots fill in the hidden field; tell them it worked and store nothing.
  if (String(formData.get("company") ?? "").trim()) return { status: "success" };

  const fieldErrors: OrderState["fieldErrors"] = {};
  if (!values.name) fieldErrors.name = "Please tell us your name.";
  if (!values.phone) fieldErrors.phone = "Please add a phone or WhatsApp number so we can confirm your order.";
  else if (values.phone.replace(/\D/g, "").length < 7) fieldErrors.phone = "That number looks too short.";
  if (!values.address) fieldErrors.address = "Please tell us where to deliver it, or where you'd like to pick it up.";
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) fieldErrors.email = "That email address doesn't look right.";
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: "Please check the highlighted fields.", fieldErrors, values };
  }

  // A complete order posted within moments of the page loading is a bot: the same quiet "thank you".
  // (Checked after the fields, so a person who presses Send too soon sees what's missing instead.)
  const startedAt = Number(formData.get("startedAt"));
  if (startedAt && Date.now() - startedAt < MIN_FILL_MS) return { status: "success" };

  const productId = String(formData.get("productId") ?? "");
  if (!UUID.test(productId)) return { status: "error", message: "This page is out of date. Please reload it and try again.", values };

  const db = adminClient();
  if (!db) return { status: "error", message: "Ordering online isn't working right now. Please send your order on WhatsApp instead.", values };

  // The product as it is now: the page may be older than the last change in the dashboard.
  const { data: row, error: loadError } = await db.from("products").select("*").eq("id", productId).eq("published", true).maybeSingle();
  if (loadError) {
    console.error("[order] product lookup failed", loadError.message);
    return { status: "error", message: TRY_AGAIN, values };
  }
  if (!row) return { status: "error", message: "Sorry, this product isn't available any more.", values };
  let product: Product;
  try {
    product = rowToProduct(row, new Map());
  } catch (error) {
    console.error("[order] product data unreadable", error);
    return { status: "error", message: TRY_AGAIN, values };
  }

  const groups = optionGroups(product.options);
  const picked = groups.map((_, index) => {
    const value = formData.get(optionFieldName(index));
    return typeof value === "string" ? value : null;
  });
  const chosen = resolveSelection(product, picked);
  if (!chosen.ok) return { status: "error", message: chosen.error, values };

  const offer = offerFor(product, chosen.variant);
  const soldOut = "Sorry, that's out of stock right now. Please choose something else, or ask us on WhatsApp.";
  if (!isOrderable(offer.stockStatus)) return { status: "error", message: soldOut, values };

  const { min, max } = quantityLimits(product);
  const quantityText = String(formData.get("quantity") ?? "").trim();
  const quantity = /^\d{1,4}$/.test(quantityText) ? Number(quantityText) : Number.NaN;
  if (!Number.isInteger(quantity) || quantity < min) {
    return { status: "error", message: min > 1 ? `Please order at least ${min}.` : "Please choose how many you'd like.", values };
  }
  if (quantity > max) return { status: "error", message: `You can order up to ${max} at a time. For more, message us on WhatsApp.`, values };
  // A stock count is the product's own (variants keep only a status), so it limits products without variants.
  const counted = !usesVariants(product) && row.stock_quantity !== null && (offer.stockStatus === "in_stock" || offer.stockStatus === "low_stock");
  if (counted && row.stock_quantity === 0) return { status: "error", message: soldOut, values };
  if (counted && row.stock_quantity !== null && quantity > row.stock_quantity) {
    return { status: "error", message: `We have only ${row.stock_quantity} right now. Please lower the quantity.`, values };
  }

  const hash = await ipHash();
  if (hash) {
    const since = new Date(Date.now() - RATE_WINDOW_MINUTES * 60_000).toISOString();
    const { count } = await db.from("messages").select("id", { count: "exact", head: true }).eq("ip_hash", hash).gte("created_at", since);
    if ((count ?? 0) >= RATE_MAX) {
      return { status: "error", message: "We've received several messages from you just now. Please wait a few minutes, or message us on WhatsApp.", values };
    }
  }

  const order: PlacedOrder = {
    name: values.name,
    product: product.name,
    variant: selectionLabel(groups, chosen.selection).slice(0, 200),
    quantity,
    unitPrice: offer.price,
    currency: product.currency,
  };
  const path = routes.product(product.slug);
  const userAgent = ((await headers()).get("user-agent") ?? "").slice(0, 400);
  const { error } = await db.from("messages").insert({
    kind: "order",
    name: values.name,
    phone: values.phone,
    email: values.email,
    occasion: "Merchandise order",
    message: values.note,
    source_path: path.slice(0, 200),
    product_id: product.id,
    product_name: product.name.slice(0, 200),
    product_slug: product.slug.slice(0, 120),
    variant_label: order.variant,
    quantity,
    unit_price: offer.price,
    currency: product.currency,
    address: values.address,
    ip_hash: hash,
    user_agent: userAgent,
  });
  if (error) {
    console.error("[order] insert failed", error.message);
    return { status: "error", message: TRY_AGAIN, values };
  }

  // Email the studio after the response is sent (only when an email service is set up).
  after(() => notifyNewOrder({ ...order, sku: offer.sku, phone: values.phone, email: values.email, address: values.address, note: values.note, path }));
  return { status: "success", order };
}

type OrderEmail = PlacedOrder & { sku: string; phone: string; email: string; address: string; note: string; path: string };

/**
 * Optional email to the studio for each order, through Resend, like the enquiry email
 * (lib/email/notify.ts): off unless RESEND_API_KEY and CONTACT_NOTIFICATION_TO are set.
 * Never throws: a failed email must not fail the order, which is in Messages either way.
 */
async function notifyNewOrder(order: OrderEmail): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_NOTIFICATION_TO;
  if (!key || !to) return;

  const total = Math.round(order.unitPrice * order.quantity * 100) / 100;
  const lines = [
    `Product: ${order.product}`,
    ...(order.variant ? [`Options: ${order.variant}`] : []),
    ...(order.sku ? [`SKU: ${order.sku}`] : []),
    `Quantity: ${order.quantity} × ${formatPrice(order.unitPrice, order.currency)} = ${formatPrice(total, order.currency)}`,
    `Page: ${siteUrl}${order.path}`,
    "",
    `Name: ${order.name}`,
    `Phone / WhatsApp: ${order.phone}`,
    ...(order.email ? [`Email: ${order.email}`] : []),
    `Deliver to: ${order.address}`,
    ...(order.note ? ["", order.note] : []),
  ];

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.CONTACT_NOTIFICATION_FROM || "Sunrise website <onboarding@resend.dev>",
        to: [to],
        subject: `New order: ${order.product} × ${order.quantity} (${order.name})`,
        text: `${lines.join("\n")}\n\nConfirm it with the buyer, then mark it replied in the dashboard: ${siteUrl}/dashboard/messages`,
        ...(order.email ? { reply_to: order.email } : {}),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) console.error("[order] email failed", response.status, (await response.text()).slice(0, 200));
  } catch (error) {
    console.error("[order] email failed", error);
  }
}
