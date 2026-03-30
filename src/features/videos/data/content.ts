import groq from "groq";

import { fetchSanityOrFallback } from "@/core/sanity/client";

export type VideoItem = {
  title: string;
  provider: "youtube" | "facebook" | "upload";
  embedUrl: string;
  summary: string;
  duration: string;
};

const parseTimeToSeconds = (value: string | null) => {
  if (!value) return null;
  if (/^\d+$/.test(value)) return value;

  const match = value.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/i);
  if (!match) return null;

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  const total = hours * 3600 + minutes * 60 + seconds;

  return total > 0 ? String(total) : null;
};

const normalizeYouTubeUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    let videoId = "";

    if (host === "youtu.be") {
      videoId = parsed.pathname.replace("/", "").trim();
    } else if (host === "youtube.com" || host === "m.youtube.com") {
      if (parsed.pathname === "/watch") {
        videoId = parsed.searchParams.get("v") ?? "";
      } else if (parsed.pathname.startsWith("/shorts/")) {
        videoId = parsed.pathname.split("/")[2] ?? "";
      } else if (parsed.pathname.startsWith("/embed/")) {
        videoId = parsed.pathname.split("/")[2] ?? "";
      }
    }

    if (!videoId) {
      return url;
    }

    const embed = new URL(`https://www.youtube.com/embed/${videoId}`);
    const start = parseTimeToSeconds(parsed.searchParams.get("start") ?? parsed.searchParams.get("t"));

    if (start) {
      embed.searchParams.set("start", start);
    }

    return embed.toString();
  } catch {
    return url;
  }
};

const normalizeVideoEmbedUrl = (video: VideoItem): VideoItem => {
  if (video.provider !== "youtube") {
    return video;
  }

  return {
    ...video,
    embedUrl: normalizeYouTubeUrl(video.embedUrl)
  };
};

const fallbackVideos: VideoItem[] = [
  {
    title: "Wedding Highlight Film",
    provider: "youtube",
    embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    summary: "A featured slot for cinematic wedding highlights, emotional vows, portraits, and memorable reception moments.",
    duration: "3-5 min"
  },
  {
    title: "Pre-Wedding Reel",
    provider: "youtube",
    embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    summary: "A social-ready reel section for pre-wedding sessions, engagement teasers, and couple storytelling clips.",
    duration: "30-60 sec"
  },
  {
    title: "Studio Behind The Scenes",
    provider: "facebook",
    embedUrl: "https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Ffacebookapp%2Fvideos%2F10153231379946729%2F&show_text=false",
    summary: "A place for Facebook-hosted studio moments, promotions, event snippets, and daily behind-the-scenes content.",
    duration: "Variable"
  }
];

const videosQuery = groq`*[_type == "videoItem"] | order(featured desc, _createdAt desc){
  title,
  provider,
  embedUrl,
  summary,
  duration
}`;

export const getVideos = async () => {
  const videos = await fetchSanityOrFallback<VideoItem[]>(videosQuery, fallbackVideos);
  return videos.map(normalizeVideoEmbedUrl);
};
