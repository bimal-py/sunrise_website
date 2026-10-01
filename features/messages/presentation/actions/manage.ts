"use server";

import { refresh } from "next/cache";
import type { MessageStatus } from "@/lib/supabase/types";
import { requireAdminAction } from "@/features/dashboard/data/auth";

const STATUSES: MessageStatus[] = ["new", "read", "replied", "archived"];

export async function setMessageStatus(formData: FormData) {
  const { supabase } = await requireAdminAction();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as MessageStatus;
  if (!id || !STATUSES.includes(status)) throw new Error("Bad request.");
  const { error } = await supabase.from("messages").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}

export async function markAllRead() {
  const { supabase } = await requireAdminAction();
  const { error } = await supabase.from("messages").update({ status: "read" }).eq("status", "new");
  if (error) throw new Error(error.message);
  refresh();
}

export async function deleteMessage(formData: FormData) {
  const { supabase } = await requireAdminAction();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Bad request.");
  const { error } = await supabase.from("messages").delete().eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}
