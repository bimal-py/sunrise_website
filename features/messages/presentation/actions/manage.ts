"use server";

import { refresh } from "next/cache";
import type { MessageStatus } from "@/lib/supabase/types";
import { requireAdminAction } from "@/features/dashboard/data/auth";

/**
 * Messages (dashboard): enquiries from the contact page and orders from the shop. Each action
 * stays on the page (filters and page number are in the address) and re-renders it. A failure
 * throws, and the dashboard's error screen offers "Try again".
 */

const STATUSES: MessageStatus[] = ["new", "read", "replied", "archived"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The status form on a message: New, Read, Replied or Archived. */
export async function setMessageStatus(formData: FormData) {
  const { supabase } = await requireAdminAction();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as MessageStatus;
  if (!UUID.test(id) || !STATUSES.includes(status)) throw new Error("That status change isn't possible.");
  const { error } = await supabase.from("messages").update({ status }).eq("id", id);
  if (error) throw new Error(`Couldn't update the message: ${error.message}`);
  refresh();
}

/** "Mark all as read": every new message (enquiries and orders) becomes read. */
export async function markAllRead() {
  const { supabase } = await requireAdminAction();
  const { error } = await supabase.from("messages").update({ status: "read" }).eq("status", "new");
  if (error) throw new Error(`Couldn't mark the messages as read: ${error.message}`);
  refresh();
}

/** Delete one message for good (asked first on the page). */
export async function deleteMessage(formData: FormData) {
  const { supabase } = await requireAdminAction();
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) throw new Error("That message doesn't exist any more.");
  const { error } = await supabase.from("messages").delete().eq("id", id);
  if (error) throw new Error(`Couldn't delete the message: ${error.message}`);
  refresh();
}
