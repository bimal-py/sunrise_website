"use server";

import { randomBytes } from "node:crypto";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { routes } from "@/lib/routes";
import type { Database } from "@/lib/supabase/types";
import { requireAdminAction } from "@/features/dashboard/data/auth";
import { bool, str } from "@/features/dashboard/data/form";
import type { ActionState } from "@/features/dashboard/presentation/components/ui/action-state";
import {
  isReservedRootFileName,
  isRootFileType,
  isStoragePath,
  ROOT_FILE_BUCKET,
  ROOT_FILE_MAX_BODY,
  ROOT_FILE_NAME,
} from "@/features/root-files/domain/root-file";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LIST = routes.dashboardSection("root-files");

/*
 * Root files and the IndexNow key are read straight from the database by
 * app/api/root-files (kept in memory for a minute) and lib/seo/indexnow.ts; no cached page
 * shows them, so saving never touches a cache tag.
 */

/** Back to the list, which says what happened ("Saved /ads.txt."); `draft` adds that it isn't served. */
function backToList(outcome: "saved" | "deleted", label: string, draft = false): never {
  redirect(`${LIST}?${outcome}=${encodeURIComponent(label.slice(0, 120))}${draft ? "&state=draft" : ""}`);
}

/** Whether `path` is a stored object in the files bucket (checked as the signed-in admin). */
async function isUploaded(db: SupabaseClient<Database>, path: string): Promise<boolean> {
  const { data, error } = await db.storage.from(ROOT_FILE_BUCKET).info(path);
  if (!error && data) return true;
  // Fallback for Storage servers without the info endpoint: look for the name in its folder.
  const slash = path.lastIndexOf("/");
  const name = path.slice(slash + 1);
  const { data: entries } = await db.storage.from(ROOT_FILE_BUCKET).list(slash >= 0 ? path.slice(0, slash) : "", { search: name, limit: 100 });
  return Boolean(entries?.some((entry) => entry.name === name && entry.id));
}

/** "Text/HTML;Charset=UTF-8" → "text/html; charset=utf-8". */
function normaliseType(value: string): string {
  return value.toLowerCase().replace(/\s*;\s*/, "; ");
}

/** Creates (no id) or saves a root file, then goes back to the list. */
export async function saveRootFile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdminAction();
  const id = str(formData, "id", 40);
  if (id && !UUID.test(id)) return { status: "error", message: "That file no longer exists. Reload the page." };
  const fileName = str(formData, "file_name", 200).replace(/^\/+/, "");
  const contentType = normaliseType(str(formData, "content_type", 120));
  const storagePath = str(formData, "storage_path", 500);
  // Browsers send a textarea's line breaks as CRLF; files are stored with plain LF.
  const body = String(formData.get("body") ?? "")
    .replace(/\r\n?/g, "\n")
    .trim();

  const problems: string[] = [];
  if (!ROOT_FILE_NAME.test(fileName)) {
    problems.push("File name: letters, digits, dots, hyphens or underscores, ending in an extension (ads.txt, google1234abcd.html). No folders.");
  } else if (isReservedRootFileName(fileName)) {
    problems.push(`The site makes /${fileName} itself, so a root file can't replace it.`);
  }
  if (!isRootFileType(contentType)) problems.push("Content type: choose one from the list, or type a MIME type such as application/wasm.");
  if (body.length > ROOT_FILE_MAX_BODY) problems.push(`The text is too long: ${body.length.toLocaleString("en")} characters (at most ${ROOT_FILE_MAX_BODY.toLocaleString("en")}).`);
  if (storagePath && !isStoragePath(storagePath)) problems.push("Choose the uploaded file again: its address isn't valid.");
  if (!storagePath && !body) problems.push("Add the file's contents, or choose an uploaded file.");
  if (problems.length > 0) return { status: "error", message: problems.join(" ") };

  if (storagePath && !(await isUploaded(supabase, storagePath))) {
    return { status: "error", message: "The chosen file isn't in the Files bucket any more. Choose it again, or upload it." };
  }

  let taken = supabase.from("root_files").select("id", { count: "exact", head: true }).eq("file_name", fileName);
  if (id) taken = taken.neq("id", id);
  const { count, error: takenError } = await taken;
  if (takenError) return { status: "error", message: `Couldn't check the name: ${takenError.message}` };
  if (count) return { status: "error", message: `There's already a root file called ${fileName}.` };

  const row = {
    file_name: fileName,
    content_type: contentType,
    body,
    storage_path: storagePath || null,
    published: bool(formData, "published"),
    note: str(formData, "note", 300),
  };

  if (!id) {
    const { error } = await supabase.from("root_files").insert(row);
    if (error) return { status: "error", message: `Couldn't create the file: ${error.message}` };
  } else {
    const { data, error } = await supabase.from("root_files").update(row).eq("id", id).select("id");
    if (error) return { status: "error", message: `Couldn't save the file: ${error.message}` };
    if (data.length === 0) return { status: "error", message: "That file no longer exists. Reload the page." };
  }
  backToList("saved", `/${fileName}`, !row.published);
}

export async function deleteRootFile(formData: FormData): Promise<void> {
  const { supabase } = await requireAdminAction();
  const id = str(formData, "id", 40);
  if (!UUID.test(id)) throw new Error("That file couldn't be found. Reload the page and try again.");
  const { data, error } = await supabase.from("root_files").delete().eq("id", id).select("file_name");
  if (error) throw new Error(`Couldn't delete the file: ${error.message}`);
  if (data.length === 0) redirect(LIST);
  backToList("deleted", `/${data[0].file_name}`);
}

/** IndexNow on: a new random key, served at /<key>.txt by app/api/root-files. Keeps a key already set. */
export async function turnOnIndexNow(): Promise<void> {
  const { supabase } = await requireAdminAction();
  const key = randomBytes(16).toString("hex");
  const { error } = await supabase.from("site_settings").update({ indexnow_key: key }).eq("id", 1).eq("indexnow_key", "");
  if (error) throw new Error(`Couldn't turn IndexNow on: ${error.message}`);
  refresh();
}

export async function turnOffIndexNow(): Promise<void> {
  const { supabase } = await requireAdminAction();
  const { error } = await supabase.from("site_settings").update({ indexnow_key: "" }).eq("id", 1);
  if (error) throw new Error(`Couldn't turn IndexNow off: ${error.message}`);
  refresh();
}
