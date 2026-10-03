import type { MessageRow } from "@/lib/supabase/types";

/** What a message is about, as its title in the dashboard: "Wedding enquiry", "Order: Walnut photo frame". */
export function messageSubject(message: Pick<MessageRow, "kind" | "occasion" | "product_name">): string {
  if (message.kind === "order") return `Order: ${message.product_name || "a product"}`;
  const occasion = message.occasion.trim();
  if (!occasion || occasion === "Something else") return "General enquiry";
  return `${occasion} enquiry`;
}
