# Sunrise Photo Studio · सनराइज फोटो स्टुडियो

Website for Sunrise Photo Studio, Arjunchaupari, Syangja: wedding and ceremony photography and films,
premium albums, frames and prints. https://sunrisedigitalphotostudio.com.np

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # prerenders every service, print, film and post
npm run typecheck && npm run lint
```

## Editing content

| What | Where |
| --- | --- |
| Phone, WhatsApp, email, address, social links | `lib/config/site.ts` |
| Services (weddings, pasni, portraits…) | `features/services/data/services.seed.ts` |
| Prints (albums, frames, canvas…) | `features/prints/data/prints.seed.ts` |
| Film titles, categories, hiding a film | `data/films/curation.json` |
| Blog posts | `content/blog/<slug>.mdx` |

## New films from YouTube

```bash
pip install pillow
python3 scripts/fetch-youtube.py     # pulls the channel's latest videos + thumbnails
python3 scripts/optimize-images.py   # builds the web sizes
```

Then give new films a title and category in `data/films/curation.json`.

## Writing a blog post

1. Put the cover photo (the studio's own; a film still works) in `assets/images/blog/<descriptive-name>.jpg`.
2. `python3 scripts/optimize-images.py`
3. Add `content/blog/<slug>.mdx` with `cover: "/images/blog/<descriptive-name>.webp"` and the credit (see the
   existing posts).

All conventions for humans and AI assistants: [`CLAUDE.md`](CLAUDE.md).
