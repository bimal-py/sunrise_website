import "server-only";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { readClient } from "@/lib/supabase/read-client";
import { DEFAULT_ROOT_FILE_TYPE, isRootFileType, isStoragePath, ROOT_FILE_NAME } from "@/features/root-files/domain/root-file";

/** A published root file: its text, or the uploaded file (in the files bucket) served in its place. */
export type ServedFile = { contentType: string; body: string; storagePath: string | null };

export type RootFileLookup = { status: "found"; file: ServedFile } | { status: "missing" } | { status: "unavailable" };

type Snapshot = { files: Map<string, ServedFile>; indexNowKey: string; loadedAt: number };

/*
 * Every request for /<something>.<ext> that no page claims lands here, bots' probes
 * included, so files are kept in this server instance's memory instead of going through
 * unstable_cache (a data-cache read per request is exactly what the cost rule avoids).
 * At most one small query a minute per instance, plus an early reload on a miss (at most
 * every 10 s) so a file just added in the dashboard doesn't 404 for a whole minute.
 */
const MAX_AGE_MS = 60_000;
const MISS_RELOAD_MS = 10_000;
/** After a failed load, keep serving the last good copy this long before trying again. */
const RETRY_MS = 10_000;

let snapshot: Snapshot | null = null;
let loading: Promise<Snapshot | null> | null = null;
let retryAt = 0;

async function load(): Promise<Snapshot> {
  const db = readClient();
  const [files, settings] = await Promise.all([
    db.from("root_files").select("file_name, content_type, body, storage_path").eq("published", true),
    db.from("site_settings").select("indexnow_key").eq("id", 1).maybeSingle(),
  ]);
  if (files.error) throw new Error(`root_files: ${files.error.message}`);
  if (settings.error) throw new Error(`site_settings: ${settings.error.message}`);
  return {
    files: new Map(
      files.data.map((row) => [
        row.file_name,
        {
          contentType: isRootFileType(row.content_type) ? row.content_type : DEFAULT_ROOT_FILE_TYPE,
          body: row.body,
          storagePath: row.storage_path && isStoragePath(row.storage_path) ? row.storage_path : null,
        },
      ]),
    ),
    indexNowKey: settings.data?.indexnow_key ?? "",
    loadedAt: Date.now(),
  };
}

/** The files, reloaded when the copy in memory is older than `maxAge` (one load at a time). */
function filesNoOlderThan(maxAge: number): Snapshot | null | Promise<Snapshot | null> {
  const now = Date.now();
  if (snapshot && now - snapshot.loadedAt < maxAge) return snapshot;
  if (now < retryAt) return snapshot;
  loading ??= load()
    .then((fresh) => {
      snapshot = fresh;
      return fresh;
    })
    .catch((error: unknown) => {
      console.error("[root-files] couldn't load the files", error);
      retryAt = Date.now() + RETRY_MS;
      return snapshot;
    })
    .finally(() => {
      loading = null;
    });
  return loading;
}

function lookup(data: Snapshot, name: string): ServedFile | undefined {
  // The IndexNow key file: proves to Bing that the key lib/seo/indexnow.ts sends is ours.
  if (data.indexNowKey && name === `${data.indexNowKey}.txt`) return { contentType: "text/plain; charset=utf-8", body: data.indexNowKey, storagePath: null };
  return data.files.get(name);
}

/** A published root file (or the IndexNow key file) by its exact name. */
export async function findRootFile(name: string): Promise<RootFileLookup> {
  if (!isSupabaseConfigured || !ROOT_FILE_NAME.test(name)) return { status: "missing" };
  let data = await filesNoOlderThan(MAX_AGE_MS);
  let file = data ? lookup(data, name) : undefined;
  if (!file && data && Date.now() - data.loadedAt >= MISS_RELOAD_MS) {
    data = await filesNoOlderThan(MISS_RELOAD_MS);
    file = data ? lookup(data, name) : undefined;
  }
  if (file) return { status: "found", file };
  return data ? { status: "missing" } : { status: "unavailable" };
}
