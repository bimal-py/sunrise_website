import { supabaseUrl } from "@/lib/supabase/env";
import { findRootFile } from "@/features/root-files/data/root-files.repository";
import { ROOT_FILE_BUCKET } from "@/features/root-files/domain/root-file";

const TEXT = "text/plain; charset=utf-8";
/** How long the upload may take to start answering before the request gives up. */
const UPSTREAM_TIMEOUT_MS = 15_000;

/**
 * Types served without the sandbox: it would stop the browser's PDF viewer, and PDF viewers
 * run a PDF's scripts in their own isolated process, never with the site's cookies.
 */
const UNSANDBOXED = new Set(["application/pdf"]);

/** What every served root file carries, text or uploaded. */
function fileHeaders(contentType: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": contentType,
    "Cache-Control": "public, max-age=300, s-maxage=300",
    "X-Content-Type-Options": "nosniff",
  };
  // These files are data, never pages: whatever an HTML, SVG or XML one holds can't run
  // scripts with the site's cookies (the dashboard's session among them).
  if (!UNSANDBOXED.has(contentType.split(";")[0].trim().toLowerCase())) headers["Content-Security-Policy"] = "sandbox";
  return headers;
}

function unavailable(): Response {
  // A 503 asks crawlers to come back later, where a 404 could cost a Search Console verification.
  return new Response("Temporarily unavailable", { status: 503, headers: { "Content-Type": TEXT, "Cache-Control": "no-store", "Retry-After": "60" } });
}

function notFound(): Response {
  return new Response("Not found", { status: 404, headers: { "Content-Type": TEXT, "Cache-Control": "public, max-age=60, s-maxage=300" } });
}

/**
 * Root files (dashboard → Root Files) and the IndexNow key file, at /<name>.<ext>. Requests
 * arrive through the fallback rewrite in next.config.ts, so only names that no page, public
 * file or metadata route (robots.txt, sitemap.xml, the icons) has claimed reach this. An
 * uploaded file is streamed from the public files bucket with the content type set for it.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const result = await findRootFile(name);

  if (result.status === "unavailable") return unavailable();
  if (result.status === "missing") return notFound();

  const { file } = result;
  if (!file.storagePath) return new Response(file.body, { headers: fileHeaders(file.contentType) });

  // The path was checked when it was saved (and again when it was loaded); each part is encoded on its own.
  const source = `${supabaseUrl}/storage/v1/object/public/${ROOT_FILE_BUCKET}/${file.storagePath.split("/").map(encodeURIComponent).join("/")}`;
  let upstream: Response;
  try {
    upstream = await fetch(source, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
  } catch (error) {
    console.error("[root-files] couldn't fetch the uploaded file", error);
    return unavailable();
  }
  if (upstream.status === 404 || upstream.status === 400) {
    // The upload was deleted or moved in the file manager.
    await upstream.body?.cancel();
    return notFound();
  }
  if (!upstream.ok || !upstream.body) {
    console.error(`[root-files] the files bucket answered ${upstream.status} for ${file.storagePath}`);
    await upstream.body?.cancel();
    return unavailable();
  }
  return new Response(upstream.body, { headers: fileHeaders(file.contentType) });
}
