"use server";

import { randomBytes } from "node:crypto";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { routes } from "@/lib/routes";
import { requireAdminAction } from "@/features/dashboard/data/auth";
import { bool, str } from "@/features/dashboard/data/form";
import type { ActionState } from "@/features/dashboard/presentation/components/form-controls";
import { isReservedRootFileName, isRootFileType, ROOT_FILE_MAX_BODY, ROOT_FILE_NAME } from "@/features/root-files/domain/root-file";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/*
 * Root files and the IndexNow key are read straight from the database by
 * app/api/root-files (kept in memory for a minute) and lib/seo/indexnow.ts; no cached page
 * shows them, so saving only refreshes the dashboard, never a cache tag.
 */

/** Creates (no id) or updates a root file. */
export async function saveRootFile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdminAction();
  const id = str(formData, "id", 40);
  const fileName = str(formData, "file_name", 200).replace(/^\/+/, "");
  const contentType = str(formData, "content_type", 80);
  // Browsers send a textarea's line breaks as CRLF; files are stored with plain LF.
  const body = String(formData.get("body") ?? "").replace(/\r\n?/g, "\n").trim();

  const problems: string[] = [];
  if (id && !UUID.test(id)) return { status: "error", message: "That file no longer exists." };
  if (!ROOT_FILE_NAME.test(fileName)) {
    problems.push("File name: letters, digits, dots, hyphens or underscores, ending in an extension (ads.txt, google1234abcd.html). No folders.");
  } else if (isReservedRootFileName(fileName)) {
    problems.push(`The site makes /${fileName} itself, so a root file can't replace it.`);
  }
  if (!isRootFileType(contentType)) problems.push("Choose what kind of file it is.");
  if (body.length > ROOT_FILE_MAX_BODY) problems.push(`The file is too long: ${body.length.toLocaleString("en")} characters (at most ${ROOT_FILE_MAX_BODY.toLocaleString("en")}).`);
  if (problems.length > 0) return { status: "error", message: problems.join(" ") };

  let taken = supabase.from("root_files").select("id", { count: "exact", head: true }).eq("file_name", fileName);
  if (id) taken = taken.neq("id", id);
  const { count } = await taken;
  if (count) return { status: "error", message: `There's already a root file called ${fileName}.` };

  const row = { file_name: fileName, content_type: contentType, body, published: bool(formData, "published"), note: str(formData, "note", 300) };

  if (!id) {
    const { error } = await supabase.from("root_files").insert(row);
    if (error) return { status: "error", message: `Couldn't save: ${error.message}` };
    redirect(routes.dashboardSection("root-files"));
  }

  const { data, error } = await supabase.from("root_files").update(row).eq("id", id).select("id");
  if (error) return { status: "error", message: `Couldn't save: ${error.message}` };
  if (data.length === 0) return { status: "error", message: "That file no longer exists." };
  refresh();
  return {
    status: "success",
    message: row.published
      ? `Saved. /${fileName} serves it within a few minutes (browsers and the CDN keep a copy up to five).`
      : `Saved as hidden: /${fileName} answers “not found” until you publish it.`,
  };
}

export async function deleteRootFile(formData: FormData) {
  const { supabase } = await requireAdminAction();
  const id = str(formData, "id", 40);
  if (!UUID.test(id)) throw new Error("Bad request.");
  const { error } = await supabase.from("root_files").delete().eq("id", id);
  if (error) throw new Error(error.message);
  redirect(routes.dashboardSection("root-files"));
}

/** IndexNow on: a new random key, served at /<key>.txt by app/api/root-files. Keeps a key already set. */
export async function turnOnIndexNow() {
  const { supabase } = await requireAdminAction();
  const key = randomBytes(16).toString("hex");
  const { error } = await supabase.from("site_settings").update({ indexnow_key: key }).eq("id", 1).eq("indexnow_key", "");
  if (error) throw new Error(error.message);
  refresh();
}

export async function turnOffIndexNow() {
  const { supabase } = await requireAdminAction();
  const { error } = await supabase.from("site_settings").update({ indexnow_key: "" }).eq("id", 1);
  if (error) throw new Error(error.message);
  refresh();
}
