#!/usr/bin/env python3
"""Pull the studio's films from its YouTube channel.

    data/films/channel.json                      channel id + videos to add by hand (older than the feed)
  → features/films/data/generated/videos.json    id, YouTube title, upload date, description
  → assets/images/films/<id>.jpg                 the film's thumbnail (black side/top bars trimmed)

The channel's public RSS feed lists the 15 most recent uploads, so the output is
MERGED with what is already there: films never drop off the site just because
the channel posted more. Titles, categories and hiding live in
data/films/curation.json (hand-edited, never overwritten here).

    python3 scripts/fetch-youtube.py
    python3 scripts/optimize-images.py     # then build the web sizes

Needs Pillow (pip install pillow). No API key: RSS feed + oEmbed + the watch page.
"""

from __future__ import annotations

import json
import re
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
CHANNEL = ROOT / "data/films/channel.json"
OUT = ROOT / "features/films/data/generated/videos.json"
THUMBS = ROOT / "assets/images/films"

NS = {
    "atom": "http://www.w3.org/2005/Atom",
    "yt": "http://www.youtube.com/xml/schemas/2015",
    "media": "http://search.yahoo.com/mrss/",
}
UA = {"User-Agent": "Mozilla/5.0 (sunrise-photo-studio site build)"}


def get(url: str) -> bytes:
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as res:
        return res.read()


def from_feed(channel_id: str) -> list[dict]:
    root = ET.fromstring(get(f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"))
    videos = []
    for entry in root.findall("atom:entry", NS):
        group = entry.find("media:group", NS)
        videos.append({
            "id": entry.findtext("yt:videoId", namespaces=NS),
            "title": entry.findtext("atom:title", namespaces=NS).strip(),
            "publishedAt": entry.findtext("atom:published", namespaces=NS)[:10],
            "description": (group.findtext("media:description", default="", namespaces=NS) if group is not None else "").strip(),
        })
    return videos


def from_watch_page(video_id: str) -> dict:
    """For a video older than the feed: title via oEmbed, upload date from the watch page."""
    meta = json.loads(get(f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"))
    page = get(f"https://www.youtube.com/watch?v={video_id}").decode("utf-8", "replace")
    date = re.search(r'"(?:uploadDate|publishDate)":"(\d{4}-\d{2}-\d{2})', page)
    return {"id": video_id, "title": meta["title"].strip(), "publishedAt": date.group(1) if date else "", "description": ""}


def trim_bars(img: Image.Image, threshold: int = 14) -> Image.Image:
    """Cut the black pillar/letterbox bars YouTube adds around vertical or odd-ratio uploads."""
    grey = img.convert("L")
    w, h = grey.size
    px = grey.load()

    def col_dark(x: int) -> bool:
        return sum(px[x, y] for y in range(0, h, 4)) / len(range(0, h, 4)) < threshold

    def row_dark(y: int) -> bool:
        return sum(px[x, y] for x in range(0, w, 4)) / len(range(0, w, 4)) < threshold

    left = next((x for x in range(w) if not col_dark(x)), 0)
    right = next((x for x in range(w - 1, -1, -1) if not col_dark(x)), w - 1) + 1
    top = next((y for y in range(h) if not row_dark(y)), 0)
    bottom = next((y for y in range(h - 1, -1, -1) if not row_dark(y)), h - 1) + 1
    if (right - left) < w * 0.25 or (bottom - top) < h * 0.25:
        return img  # mostly dark frame: leave it alone
    return img.crop((left, top, right, bottom))


def thumbnail(video_id: str) -> None:
    out = THUMBS / f"{video_id}.jpg"
    if out.exists():
        return
    for name in ("maxresdefault", "sddefault", "hqdefault"):
        try:
            data = get(f"https://i.ytimg.com/vi/{video_id}/{name}.jpg")
        except Exception:
            continue
        tmp = out.with_suffix(".download")
        tmp.write_bytes(data)
        img = trim_bars(Image.open(tmp).convert("RGB"))
        img.save(out, "JPEG", quality=92)
        tmp.unlink()
        print(f"  thumbnail {video_id} ({name}, {img.width}×{img.height})")
        return
    print(f"  ! no thumbnail for {video_id}")


def main() -> None:
    config = json.loads(CHANNEL.read_text(encoding="utf-8"))
    existing = {v["id"]: v for v in json.loads(OUT.read_text(encoding="utf-8"))} if OUT.exists() else {}

    fresh = from_feed(config["channelId"])
    print(f"feed: {len(fresh)} videos")
    for video in fresh:
        existing[video["id"]] = video
    for video_id in config.get("extraVideoIds", []):
        if video_id not in existing:
            existing[video_id] = from_watch_page(video_id)

    THUMBS.mkdir(parents=True, exist_ok=True)
    for video_id in existing:
        thumbnail(video_id)

    videos = sorted(existing.values(), key=lambda v: v["publishedAt"], reverse=True)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(videos, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {len(videos)} videos → {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
