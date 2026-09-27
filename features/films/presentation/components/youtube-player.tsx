"use client";

import Image from "next/image";
import { useState } from "react";
import { Play } from "lucide-react";
import type { FilmImage } from "@/features/films/domain/entities";

/**
 * Click-to-play YouTube embed. Until the visitor presses play the page shows
 * our own pre-built thumbnail, so YouTube's player (about 1 MB of script and its
 * cookies) never loads for people who only browse. Then it swaps in the
 * privacy-enhanced (youtube-nocookie) iframe and starts playing.
 */
export function YouTubePlayer({ embedUrl, title, thumbnail }: { embedUrl: string; title: string; thumbnail: FilmImage | null }) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <iframe
        src={`${embedUrl}?autoplay=1&rel=0`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        className="aspect-video w-full rounded-card border border-line bg-black"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={`Play ${title}`}
      className="group relative block w-full overflow-hidden rounded-card border border-line bg-black"
    >
      {thumbnail ? (
        <Image
          src={thumbnail.src}
          alt=""
          width={thumbnail.width}
          height={thumbnail.height}
          sizes="(min-width: 1152px) 720px, 100vw"
          priority
          placeholder="blur"
          blurDataURL={thumbnail.blurDataURL}
          className="aspect-video w-full object-cover"
        />
      ) : (
        <div className="aspect-video w-full" />
      )}
      <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-on-primary transition-colors duration-150 group-hover:bg-primary-strong">
        <Play className="h-7 w-7 translate-x-0.5 fill-current" aria-hidden />
      </span>
    </button>
  );
}
