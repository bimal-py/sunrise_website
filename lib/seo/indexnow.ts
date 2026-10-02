import "server-only";
import { after } from "next/server";
import { siteUrl } from "@/lib/config/site";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { readClient } from "@/lib/supabase/read-client";

const ENDPOINT = "https://api.indexnow.org/indexnow";

/**
 * IndexNow: tell Bing (and Yandex, Seznam, Naver: one endpoint reaches all) that pages
 * changed, so they're recrawled within minutes. Google doesn't take part; it reads the
 * sitemap. Off until a key is set (dashboard → Root Files → IndexNow); the key file is
 * served at /<key>.txt by app/api/root-files. Never throws.
 */
export async function pingIndexNow(paths: string[]): Promise<void> {
  if (paths.length === 0 || !isSupabaseConfigured) return;
  try {
    const { data } = await readClient().from("site_settings").select("indexnow_key").eq("id", 1).maybeSingle();
    const key = data?.indexnow_key;
    if (!key) return;
    const urlList = [...new Set(paths)].map((path) => new URL(path, siteUrl).toString());
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: new URL(siteUrl).host, key, keyLocation: `${siteUrl}/${key}.txt`, urlList }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok && response.status !== 202) console.error(`[indexnow] ${response.status}`, (await response.text()).slice(0, 200));
  } catch (error) {
    console.error("[indexnow] failed", error);
  }
}

/** From a server action: ping after the response is sent, so a save never waits on Bing. */
export function notifyIndexNow(paths: string[]): void {
  after(() => pingIndexNow(paths));
}
