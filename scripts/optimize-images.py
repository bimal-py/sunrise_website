#!/usr/bin/env python3
"""Pre-build every image size the site serves, so nothing is resized on request.

    assets/images/<collection>/<name>.(webp|jpg|png)       original photos (not served)
  → public/images/<collection>/<name>-<width>.webp          responsive sizes (lib/image-loader.ts picks one)
  → public/images/<collection>/og/<name>.jpg                1200×630 share image (Facebook, WhatsApp, X)
  → features/<feature>/data/generated/images.json           size + tiny blur placeholder per photo

  Collections: blog (post covers) and films (YouTube thumbnails from scripts/fetch-youtube.py).

    assets/brand/sunrise-logo.png              the original logo (2000px, not served)
  → public/brand/logo-80.png, logo-160.png   footer / small marks (40px and 80px at 2×)
  → public/brand/logo-480.webp               the home page's About card
  → public/brand/logo-512.jpg                structured data (LocalBusiness logo) and the web manifest
  → public/brand/og-default.jpg              1200×630 share image for pages without their own
  → app/icon.png, app/apple-icon.png, app/favicon.ico

    pip install pillow
    python3 scripts/optimize-images.py

Served images are cached for a year (next.config.ts), so never overwrite a file
with a different picture: give the new photo a new name.
"""

from __future__ import annotations

import base64
import io
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
# name → (manifest, widths). Keep the widths in sync with COLLECTION_WIDTHS in lib/image-loader.ts.
COLLECTIONS = {
    "blog": (ROOT / "features/blog/data/generated/images.json", [480, 800, 1280]),
    "films": (ROOT / "features/films/data/generated/images.json", [480, 800, 1280]),
}
BRAND = ROOT / "public/brand"
LOGO = ROOT / "assets/brand/sunrise-logo.png"
APP = ROOT / "app"

OG_SIZE = (1200, 630)
INK = (11, 11, 12)        # --background #0b0b0c
GOLD = (224, 178, 76)     # --primary #e0b24c
MUTED = (160, 156, 148)   # --muted #a09c94


def cover_crop(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    """Scale to fill `size`, cropping the overflow evenly (like CSS object-fit: cover)."""
    tw, th = size
    scale = max(tw / img.width, th / img.height)
    resized = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    left, top = (resized.width - tw) // 2, (resized.height - th) // 2
    return resized.crop((left, top, left + tw, top + th))


def blur_data_url(img: Image.Image) -> str:
    tiny = img.copy()
    tiny.thumbnail((16, 16))
    buf = io.BytesIO()
    tiny.save(buf, "WEBP", quality=40)
    return "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()


def build_collection(name: str, manifest_path: Path, widths: list[int]) -> None:
    src_dir = ROOT / "assets/images" / name
    out_dir = ROOT / "public/images" / name
    (out_dir / "og").mkdir(parents=True, exist_ok=True)
    manifest = {}
    for src in sorted(p for p in src_dir.iterdir() if p.suffix.lower() in (".webp", ".jpg", ".jpeg", ".png")):
        img = Image.open(src).convert("RGB")
        stem = src.stem
        total = 0
        for width in widths:
            out = out_dir / f"{stem}-{width}.webp"
            if not out.exists():
                variant = img if img.width <= width else img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)
                variant.save(out, "WEBP", quality=76, method=6)
            total += out.stat().st_size
        og = out_dir / "og" / f"{stem}.jpg"
        if not og.exists():
            cover_crop(img, OG_SIZE).save(og, "JPEG", quality=82, optimize=True, progressive=True)
        manifest[stem] = {"width": img.width, "height": img.height, "blurDataURL": blur_data_url(img)}
        print(f"{name}/{stem}: {len(widths)} sizes, {total // 1024} KB total")
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, indent=1) + "\n", encoding="utf-8")


def font(size: int, serif: bool) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = (
        [("/System/Library/Fonts/Supplemental/Georgia Bold.ttf", 0), ("/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf", 0)]
        if serif
        else [("/System/Library/Fonts/Helvetica.ttc", 0), ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 0)]
    )
    for path, index in candidates:
        try:
            return ImageFont.truetype(path, size, index=index)
        except OSError:
            continue
    return ImageFont.load_default()


def on_ink(mark: Image.Image, size: int) -> Image.Image:
    """The round logo on a solid black square (for icons that can't be transparent)."""
    square = Image.new("RGB", (size, size), INK)
    scaled = mark.resize((size, size), Image.LANCZOS)
    square.paste(scaled, (0, 0), scaled)
    return square


def build_brand() -> None:
    mark = Image.open(LOGO).convert("RGBA")
    BRAND.mkdir(parents=True, exist_ok=True)
    for px in (80, 160):
        mark.resize((px, px), Image.LANCZOS).save(BRAND / f"logo-{px}.png", optimize=True)
    # The home page's About card shows the logo large; WebP keeps the alpha at a fraction of the PNG's size.
    mark.resize((480, 480), Image.LANCZOS).save(BRAND / "logo-480.webp", "WEBP", quality=86, method=6)

    on_ink(mark, 512).save(BRAND / "logo-512.jpg", "JPEG", quality=86, optimize=True, progressive=True)
    mark.resize((192, 192), Image.LANCZOS).save(APP / "icon.png", optimize=True)
    on_ink(mark, 180).save(APP / "apple-icon.png", optimize=True)
    on_ink(mark, 64).convert("RGBA").save(APP / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])

    card = Image.new("RGB", OG_SIZE, INK)
    logo = mark.resize((400, 400), Image.LANCZOS)
    card.paste(logo, (90, 115), logo)
    draw = ImageDraw.Draw(card)
    draw.text((546, 228), "Sunrise Photo Studio", font=font(52, True), fill=GOLD)
    draw.text((550, 318), "Weddings, ceremonies and portraits.", font=font(32, False), fill=MUTED)
    draw.text((550, 364), "Films, premium albums and framed prints.", font=font(32, False), fill=MUTED)
    draw.text((550, 430), "Arjunchaupari, Syangja, Nepal", font=font(26, False), fill=MUTED)
    card.save(BRAND / "og-default.jpg", "JPEG", quality=85, optimize=True, progressive=True)
    print(f"brand: logo-80 {(BRAND / 'logo-80.png').stat().st_size // 1024} KB, og-default {(BRAND / 'og-default.jpg').stat().st_size // 1024} KB")


if __name__ == "__main__":
    for collection, (manifest, widths) in COLLECTIONS.items():
        build_collection(collection, manifest, widths)
    build_brand()
