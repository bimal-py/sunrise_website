import "server-only";

const UA = { "User-Agent": "Mozilla/5.0 (Sunrise Photo Studio website)" };

export type YouTubeVideo = { id: string; title: string; publishedAt: string; description: string };

const decode = (text: string) =>
  text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&");

/** The channel's public feed: its newest 15 uploads (no API key needed). */
export async function fetchChannelFeed(channelId: string): Promise<YouTubeVideo[]> {
  const response = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`, { headers: UA, cache: "no-store" });
  if (!response.ok) throw new Error(`YouTube feed answered ${response.status}. Check the channel id in Settings.`);
  const xml = await response.text();
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].flatMap(([, entry]) => {
    const id = /<yt:videoId>([^<]+)<\/yt:videoId>/.exec(entry)?.[1]?.trim();
    if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) return [];
    return [
      {
        id,
        title: decode(/<title>([\s\S]*?)<\/title>/.exec(entry)?.[1] ?? "").trim(),
        publishedAt: (/<published>([^<]+)<\/published>/.exec(entry)?.[1] ?? "").slice(0, 10),
        description: decode(/<media:description>([\s\S]*?)<\/media:description>/.exec(entry)?.[1] ?? "").trim(),
      },
    ];
  });
}

/** "https://youtu.be/xyz…", "…watch?v=…", "…/shorts/…" or a bare id → the 11-character id. */
export function parseYouTubeId(input: string): string | null {
  const text = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(text)) return text;
  try {
    const url = new URL(text);
    if (!/(^|\.)youtube\.com$|(^|\.)youtu\.be$|(^|\.)youtube-nocookie\.com$/.test(url.hostname)) return null;
    const id = url.hostname.endsWith("youtu.be") ? url.pathname.slice(1) : url.searchParams.get("v") ?? url.pathname.split("/").filter(Boolean).pop();
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

/** One video by id (older than the feed): title from oEmbed, upload date from its watch page. */
export async function fetchVideo(id: string): Promise<YouTubeVideo> {
  const oembed = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`, { headers: UA, cache: "no-store" });
  if (!oembed.ok) throw new Error("YouTube doesn't know that video (or it's private).");
  const meta = (await oembed.json()) as { title?: string };
  let publishedAt = "";
  try {
    const page = await (await fetch(`https://www.youtube.com/watch?v=${id}`, { headers: UA, cache: "no-store" })).text();
    publishedAt = /"(?:uploadDate|publishDate)":"(\d{4}-\d{2}-\d{2})/.exec(page)?.[1] ?? "";
  } catch {
    // The date is optional; the form lets the owner fix it.
  }
  return { id, title: (meta.title ?? "").trim(), publishedAt, description: "" };
}

/** The biggest thumbnail YouTube has for the video. */
export async function fetchThumbnail(id: string): Promise<Buffer> {
  for (const name of ["maxresdefault", "sddefault", "hqdefault"]) {
    const response = await fetch(`https://i.ytimg.com/vi/${id}/${name}.jpg`, { headers: UA, cache: "no-store" });
    if (response.ok) {
      const body = Buffer.from(await response.arrayBuffer());
      if (body.length > 2000) return body; // YouTube serves a tiny grey placeholder for missing sizes
    }
  }
  throw new Error("Couldn't download the video's thumbnail.");
}
