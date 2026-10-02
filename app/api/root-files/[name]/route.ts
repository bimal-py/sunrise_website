import { findRootFile } from "@/features/root-files/data/root-files.repository";

const TEXT = "text/plain; charset=utf-8";

/**
 * Root files (dashboard → Root Files) and the IndexNow key file, at /<name>.<ext>. Requests
 * arrive through the fallback rewrite in next.config.ts, so only names that no page, public
 * file or metadata route (robots.txt, sitemap.xml, the icons) has claimed reach this.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const result = await findRootFile(name);

  if (result.status === "found") {
    return new Response(result.file.body, {
      headers: {
        "Content-Type": result.file.contentType,
        "Cache-Control": "public, max-age=300, s-maxage=300",
        "X-Content-Type-Options": "nosniff",
        // These files are data, never pages: whatever an HTML or XML one holds can't run
        // scripts with the site's cookies (the dashboard's session among them).
        "Content-Security-Policy": "sandbox",
      },
    });
  }

  if (result.status === "unavailable") {
    // The database couldn't be reached and nothing is in memory yet. A 503 asks crawlers to
    // come back later, where a 404 could cost a Search Console verification.
    return new Response("Temporarily unavailable", { status: 503, headers: { "Content-Type": TEXT, "Cache-Control": "no-store", "Retry-After": "60" } });
  }

  return new Response("Not found", { status: 404, headers: { "Content-Type": TEXT, "Cache-Control": "public, max-age=60, s-maxage=300" } });
}
