@AGENTS.md

# Sunrise Photo Studio: Project Prompt (read before every task)

**Sunrise Photo Studio** (सनराइज फोटो स्टुडियो; the domain's longer form is "Sunrise Digital Photo Studio") is
a photo and film studio in **Arjunchaupari-5, Syangja, Nepal**. It photographs and films weddings, pasni,
bratabandha, chaurasi puja, portraits, events and panchebaja, and prints premium albums, frames, canvas and
photo prints. This site is its home: services, prints, films (from its YouTube channel), a blog, about,
contact. English-first; Nepali alongside where it helps.

It's built like `../mero_vidyalaya` (same stack, architecture, rules and "no AI-template look") with the
**navbar and breadcrumb style of `../personal_website`** and the **black-and-gold theme of the logo**.
If a request conflicts with a rule here, say so and ask.

Guiding line: **every visual element has a purpose. Remove rather than add. Simplify rather than
decorate. Clarify rather than impress.** The photos are the decoration.

---

**Live:** https://sunrisedigitalphotostudio.com.np (`NEXT_PUBLIC_SITE_URL`). GitHub `bimal-py/sunrise_website`
(its old history is an Astro + Sanity version of the site). Commits are authored by the owner only:
**no Co-Authored-By or AI attribution lines**. Commit/push only when asked.

## 0. Before every task: review the owner's changes

Run `git status` / `git diff` (and `git log -5`), check the changes against this file (tokens, radius/
shadow rules, layout, SEO, performance, content rules, generated files), and tell the owner what you found
**before** building on top. Propose, then act; don't silently revert.

## 1. Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript strict** + **Tailwind CSS v4**.
  Read `node_modules/next/dist/docs/` before using a Next API. `params` / `searchParams` are Promises.
- Icons: **`lucide-react` only** (outline). Brand marks lucide dropped (Facebook, YouTube, WhatsApp) live in
  `shared/components/brand/social-icons.tsx`. No emoji.
- Blog: MDX via `next-mdx-remote/rsc` + `remark-gfm` + `rehype-slug`.
- Fonts (`app/layout.tsx`): **Inter** (body/UI), **Cormorant Garamond** (h1/h2 only, echoes the logo's
  lettering), **Noto Sans Devanagari** for `lang="ne"` (not preloaded). All variable.
- **Supabase** (like `../personal_website`) holds all content, edited in the admin dashboard at `/dashboard`
  (§11). Pages read through the repository interfaces (`features/*/domain/repositories.ts`); without the Supabase
  env vars the repositories fall back to the static seed files / JSON / MDX, so a build never needs the database.

## 2. Structure (feature-first clean architecture)

```
app/                         Routes ONLY: metadata + params → render a View.
  (site)/                    the public site (its layout holds the nav, footer and analytics; no URL prefix)
    page.tsx                 home
    services/, services/[slug] prints/, prints/[slug] films/ (?category= filtered in the browser), films/[slug]
    blogs/ (?tag=, ?q= filtered in the browser), blogs/[slug]   about/ contact/ privacy/ error.tsx
  dashboard/                 admin (noindex): login/, (protected)/ (overview, messages, settings, …)
  api/revalidate/            refresh cache tags after direct database edits (REVALIDATE_SECRET)
  sitemap.ts robots.ts manifest.ts not-found.tsx (brings its own chrome) icon.png apple-icon.png favicon.ico
proxy.ts                     /dashboard only: session refresh + redirect to login
features/<feature>/domain|data|presentation   (services, prints, films, blog, reviews, home, site, messages, dashboard)
  site/data/settings.repository.ts   getSiteSettings(): studio name, contact, address, socials, founder, SEO
  site/data/pages.repository.ts      per-page copy + SEO overrides     site/data/redirects.repository.ts
  services/data/services.seed.ts   the studio's services (content lives here)
  prints/data/prints.seed.ts       albums, frames, canvas, prints, photo books
  films/data/generated/            videos.json + images.json (generated, never hand-edit)
shared/domain/offering.ts          what services and prints share (name, nameNe, sections, faqs, inquiry)
shared/components/  brand/{logo,social-icons} navigation/{floating-nav,breadcrumbs}
                    content/{offering-card,offering-article,offering-icon,inquiry-card}
                    ui/{container,sprite-button,badge,section-heading,empty-state,view-all-link} seo/json-ld
supabase/           migrations/ (schema, RLS, storage) · seeds/ (initial content, generated from the static files)
lib/                routes.ts (EVERY internal URL) config/site.ts (site URL, time zone, defaults, whatsappUrl())
                    supabase/{env,read-client,server,admin,client,types} cache/tags.ts media/process-image.ts
                    constants/navigation.ts seo/{metadata,breadcrumbs,structured-data} utils/ image-loader.ts
data/films/         channel.json (channel id + extra video ids) · curation.json (hand-edited titles/categories)
content/blog/*.mdx  one file = one post
assets/             originals (not served): brand/sunrise-logo.png, images/{blog,films}/
scripts/            fetch-youtube.py · optimize-images.py
```

Rules: pages call **repositories**, never JSON/seed files. Repositories are `server-only`. Client components
get plain props. `@/` imports, kebab-case files, named exports (except route files). **Build links with
`routes.*`**. Studio details (name, phone, WhatsApp, address, socials, founder) come only from `getSiteSettings()`;
client components get them as props. WhatsApp links: `whatsappUrl(site.contact.whatsapp, message)`.

## 3. Design system (tokens in `app/globals.css`, never raw hex in components)

Black and gold, from the logo. Dark neutral page; one gold. **Keep the darks clear of the crush** (owner,
2026-09-30: "it only looks nice with my brightness up"): at normal brightness a laptop shows everything
below ~30/255 as one black, so structure (cards, borders, film base) and the scene lights must sit above
it. The darks were lifted a step for this; don't push them back down, and don't rest photos darker than 82%.

| Token | Tailwind | Value | Use |
|---|---|---|---|
| `--background` | `bg-background` | `#101011` | page (neutral black, no blue/brown tint) |
| `--surface` / `--surface-raised` | `bg-surface` / `bg-raised` | `#19191B` / `#232326` | cards, footer / inputs, hover rows |
| `--surface-nav` / `-active` | `bg-nav` / `bg-nav-active` | `#161618` / `#2C261B` | floating pill + dock / active item |
| `--foreground-strong` | `text-strong` | `#F4F2EE` | headings |
| `--foreground` / `--muted` | `text-foreground` / `text-muted` | `#D8D5CF` / `#ACA89F` | body / secondary (8:1) |
| `--border` / `--border-strong` | `border-line` / `border-line-strong` | `#2F2F32` / `#48484C` | dividers / nav, inputs, chips |
| `--primary` | `bg-primary` `text-primary` | `#E0B24C` | logo gold: buttons, links, active, eyebrows, icons |
| `--primary-strong` | `hover:bg-primary-strong` | `#F0C96B` | hover (lighter on dark) |
| `--primary-soft` | `bg-primary-soft` | `#292216` | selected chips, badges |
| `--on-primary` | `text-on-primary` | `#0B0B0C` | text on gold (never white) |

- **Radius:** controls `rounded-control` 6px · cards `rounded-card` 8px · panels `rounded-panel` 10px ·
  chips, icon circles and the nav pill/dock `rounded-full`.
- **Buttons: `SpriteButton` only** (`shared/components/ui/sprite-button.tsx`), the owner's portfolio
  button in gold: a brush-stroke sprite (`/brand/ink-sprite.webp`, 23 frames) masks the gold fill, painted in
  or out frame by frame on hover/focus. `primary` = solid gold at rest, brushes away to a gold outline with
  gold text; `secondary` = gold outline (70%) with white text; on hover/focus the text turns gold and four
  gold autofocus corner brackets snap onto it (CSS only, echoes the splash). No ink on secondary (owner's call). 44px tall, 6px radius
  (the nav's WhatsApp button passes `rounded-full`). It handles internal links, external links (new tab for
  http) and `type="submit"`. No other button styles; text links use `ViewAllLink` or plain gold links.
- **Shadows:** none on cards (borders do the work). The only shadow: the floating nav pill, dock and More menu.
- **Hover:** 150ms colour/border change. No lifts, scales, glows, parallax or entrance animations.
  **Cards** (blog, service/print, film; owner, 2026-10-01): the secondary button's gold autofocus brackets
  snap onto the card (`AfBrackets` + `af-card`, 6px outside the corners) instead of a gold border; the
  border only steps to `line-strong`. Carousels holding cards give their track room so they aren't clipped.
  Exceptions are home-scene devices the owner asked for (listed with their scene in §4): the film strip's
  tear, the darkroom's dim-until-pointed, the pendant lamp leaning toward the pointer and the film light
  tilting to the row pointed at. All are mouse/
  keyboard only (`@media (hover: hover)` / `pointer: fine`), so phones see the scene whole and at full brightness.
- **Scene lights (owner, 2026-09-30/10-01):** three home scenes are lit like sets, the one place gradients are
  allowed: light falling on the wall behind the content, never over photos or UI. Every light has its
  fixture in view (a key light on 05's portrait without one read as a stray glow and was dropped). Each
  switches on as its scene comes into view and off once it's gone (`useLightSwitch` in `scene-light.tsx`,
  `.is-off` / `.lit`); without JS it's simply on. The hero stays unlit. globals.css "Scene lights".
  **A light aimed at a photo must visibly land on it** (2026-10-01): the film light ends in a pool centred on
  the still; a long beam that carries on past reads as missing, even when its axis is exact. (The lamp is the
  owner's chosen exception: its cone just swings toward the frame.) Find the target under the
  pointer from the targets' own boxes (getBoundingClientRect), not hit testing (with `elementFromPoint` the
  light didn't aim in the owner's browser, though it did headless), and re-aim on every move and scroll,
  never once per hover, so it can't go stale.
- **The one exception: the home splash** (owner's request, 2026-09-27; loader idea from aakashacharya.com.np).
  A look through the studio's camera at a sunrise: viewfinder (frame corners, rule-of-thirds grid, mono
  readouts `AF-S · f/2.8 · 1/250 · ISO 100` / `RAW`), the `SunriseMark` draws (horizon, sun rises, rays) while
  autofocus brackets hunt and lock gold, "Sunrise / Photo Studio", a mono `Capturing 00→100` counter (all CSS
  keyframes on server-rendered markup, globals.css "Splash": shows on first paint without JS). Then (JS) the
  **shutter** fires: black curtains snap shut, the viewfinder is removed while closed, they reopen on just the
  sun (the status line goes with the viewfinder; the owner removed the "Captured 0001" swap), and the sun glides and shrinks onto the hero's
  `.hero-mark` (FLIP transform + stroke width) while the hero text (`.hero-reveal`) fades in; if the hero
  mark isn't on screen it fades instead. Without JS a CSS fade ends it at 2.5s. The page renders underneath the whole time (no delay to content, LCP or crawlers). **Home
  only, on every full load** (visit, reload); not replayed when clicking Home from another page
  (`isEntryPage`). Tap/any key skips; off with reduced motion. The JS ending is **synced to the CSS
  timeline** (elapsed = now − first-contentful-paint): if the script arrives after the CSS fallback has
  already ended the splash (slow phones), it never restarts it, never locks scroll, never hides the hero. No dashed circles/diagonals (owner removed
  them): lines in the splash are camera UI only. Both marks keep the same geometry (only size and
  `strokeWidth` differ).
  **No video and no AI footage** for it: a clip has to download before it can play (slow on Nepali mobile
  data, blocked by iOS low-power autoplay) and AI video breaks the real-work-only rule.
- **Detail (owner, 2026-09-29): get the small physical details right.** Anything drawn as a real object
  (film strip, darkroom line, clapperboard, splash camera) must hold up close: what passes in front of what
  (a clip wraps its rope: front handle over and in front, back handle behind), weight and gravity (a loaded
  rope sags and dips at each clip; a piece tilts only as the rope slopes), real proportions and materials,
  and light. "Looks roughly like it" reads as artificial. Check 2x close-up crops before showing anything.
- **Banned:** gradients (except the scene lights' light), gradient text, glass/blur, glows, dotted grids, blobs, abstract shapes, stock or
  AI images, decorative illustrations, repeated logo art, big decorative icons.
- **Type:** h1/h2 Cormorant 600 (it runs small: H1 40–60px, H2 30–40px); h3 and UI Inter. Eyebrow
  `eyebrowClasses` (11px, uppercase, 0.14em, gold). Nepali lines sit under their English title.
- **Container:** `<Container>` 1280px (`narrow` 1152px for detail pages), gutters `px-4 sm:px-6 lg:px-8`.

### Navigation (personal_website style)

- Items in `lib/constants/navigation.ts`: Home · Films · Services · Prints · About · Blog · Contact, in the
  order of the home page's sections. Each has `href` (on home: a section anchor, `/#films`; smooth scroll +
  `replaceState`) and `route` (everywhere else: the section's page, `/films`). Blog has no home section.
  Active item: scroll-spy on home (`useActiveSection`, IntersectionObserver), the path elsewhere.
- **Desktop (lg+):** `FloatingNav` pill fixed `top-4` centre, **no logo**: the items with icons (active =
  `bg-nav-active` pill, gold icon) + the gold WhatsApp `SpriteButton`. On home it's transparent (no bg/border/shadow) at the top and becomes the solid
  floating pill once scrolled (`scrollY > 0`); on other pages it's solid from the first paint. `SiteHeader`
  is only an `h-20` spacer (inner pages clear the pill; the home hero pulls up with `lg:-mt-20`) + the nav.
- **Mobile:** no top bar. An icon dock fixed `bottom-4`: Home, Films, Services, Prints, Contact + "More"
  (About, Blog, call, WhatsApp). The footer has `pb-28` below `lg` so the dock never covers it.
- No motion library and no blur (the portfolio's pill uses both; this keeps its look in plain CSS).
- **Breadcrumbs** (`shared/components/navigation/breadcrumbs.tsx`): mono, uppercase, tracked, gold on
  hover; last crumb truncated. Detail pages lead with one; index pages don't. Build one `Crumb[]` and pass
  it to both `<Breadcrumbs>` and `breadcrumbJsonLd()`.

## 4. Page layout rules

- One `<h1>` per page. Detail pages: breadcrumbs → header (icon, H1, Nepali name, summary) → main column
  1.6fr + `InquiryCard` sidebar 1fr (`lg:sticky`); on mobile the inquiry card comes first.
- **Home is a short film in numbered scenes** (owner, 2026-09-27: "be creative, like the splash"). After the
  splash and hero, each section is a scene with its own photographic device. Everything is **centred**, like
  the hero (`SceneHeading`: a centred title card, "—— Scene 02 ——" in mono between gold rules, serif title,
  lede; numbering follows page order, computed in the view). A scene's "View all …" link (`SceneLink`:
  underlined gold text + →; `besideArrows` drops the → on desktop, where the carousel's scroll arrows sit
  beside it) sits centred at its bottom; carousels put it between their arrows (`Carousel center`): desktop `(←) View all 15 films (→)`, phones the
  dots with the link under them. Between the scroll arrows the link has **no arrow of its own** (arrows there
  only ever mean "scroll"; an external link may use ↗); standing alone, links keep their →. Carousels rewind to the start whenever they leave the screen, so a scene
  always opens fresh with the last item cut at the edge:
  01 `#films` **Now showing**: `FilmStrip`, the films as a 35mm strip (sprocket holes, edge print
  `SUNRISE 400 ▸ 01A`, "end of roll" frame → /films) in the shared `Carousel` (swipe; arrows lg+, dots below
  lg, like the portfolio); with a mouse the stills rest dim and the frame pointed at **tears out** (owner,
  2026-09-29): the strip splits either side with matching jagged edges and the frame comes 4% closer. The
  `<article>` is the fixed hover slot and the inner `.film-piece` moves, so the pointer never falls into a
  torn gap and flickers. Lit by a tungsten `PendantLamp` hanging over the title card (the section has extra
  top room for it: `pt-30 lg:pt-40`): black bell shade on a cord from the dark ceiling, the bulb glowing in
  its mouth, a warm cone on the wall behind the strip; with a mouse it leans toward the pointer (70% of the
  way, up to 22°); pointed at a film it turns fully onto its still (up to 40°, `data-spot`); it swings back
  when the pointer leaves, as a damped pendulum (period ~2.4s, cord, shade and cone turning together). Owner,
  2026-10-01: keep it like this; a pool of light over the card, a swivelling shade and a 62° reach to the
  card's top edge were tried and rejected · 02 `#services` **The shot list**: `ShotList`, 4 featured services as numbered
  rows; the service's `coverFilmId` still develops on hover (desktop), shows small on phones it becomes a
  storyboard (panels: full-width still, gold viewfinder corners, "SHOT 01" stamp, title, note); a final
  numbered "And many more" row lists the rest (`shortName`s), then "View all 7 services" centred below. Lit by a `FilmLight`
  (owner's pick, 2026-10-01): a Fresnel head in a yoke on a drop rod from the grid, upper left of the title
  card, **desktop only** (lg+; owner: not on phones or tablets), its barn doors closed to a hard-edged 11° shaft; at
  rest it rakes into the list and fades out; with a mouse it tilts (0.7s) onto the pointed row and the shaft
  ends (`--throw`) in a focused, soft pool of light centred on that row's still (`data-shot` rows,
  `data-spot-center`; across a row without one), sliding from row to row like a follow spot (owner: "more
  focused, a little faded", not a big white ball) · 03 `#prints` **From the darkroom**: `DarkroomWall`, the prints as CSS objects
  (open album, walnut-framed print, canvas with its wrapped side, three loose prints, a closed photo book)
  holding each print's `previewFilmIds` stills, **hanging from a drying line** (owner, 2026-09-29:
  "realistic, not artistic"; see §3 "Detail"). The rope is a round twisted cord (layered SVG strokes + a
  strand pattern) that sags as a real loaded line does (`drying-line.ts`, y = M(x)/H from each piece's weight
  and clips, hooks off screen); `--line-scale` shrinks its drops below sm so phone tilts match desktop. Small
  black binder clips with steel handles **wrap** the rope: back handle in a layer behind the rope, front
  handle over the top and down in front, both into the body's rolled lip (rejected before this: gold pegs,
  wooden pegs, paper clips, multicoloured clips). Wide pieces (album, canvas) hang on two clips, narrow ones
  (frame, book, each loose print) on one; every piece settles to the rope's slope where it hangs
  (`atan2(drop, run in cqw)`, exact at any width). Museum labels share one baseline under the pieces; it
  scrolls sideways in a `Carousel` (`(←) View all prints and albums (→)`); with a mouse the pieces rest at 88%
  and the one pointed at lights up. Photos are never torn (a torn wedding print reads as a breakup), so the
  tear stays with the film strip. Lit by a red `Safelight`: a small black box on its cord to the right of
  the title card (beside the "Scene 03" line on phones), its red filter glowing behind a screwed bezel, a
  halo round it and the room tinted dim red behind the line; the photos keep their own colours · 04 `#reviews` **Kind words**: `ReviewCard`s (notched corner with a gold lens-ring monogram of the
  client's initials; no avatars) in a `Carousel`; **only rendered when real reviews exist**
  (the `reviews` table; dev shows labelled SAMPLE cards while it's empty, production never) · 05
  `#about` **Behind the lens**: `BehindTheLens`, the founder's portrait in the splash's viewfinder (AF
  brackets, readouts), name, role, their own words; until the founder's name is set (dashboard → Settings) it shows
  the studio (logo + true facts) · 06 `#contact` **Book a date**: `Slate`, a clapperboard (gold/black striped
  sticks; the top one rests closed and plays one quick open-and-clap, 7°, every time the slate scrolls into view;
  never left open over the page, `Clapper`) with PRODUCTION / BEHIND THE CAMERA /
  DATE / SCENE / TAKE fields, then WhatsApp, call, email, address, socials.
  Featured items only; everything else lives on the detail pages. Keep new home content inside this scene
  concept rather than adding generic sections.
- **Blog** (owner, 2026-10-01: "like the portfolio's blog"; `../personal_website`). Index: a centred header
  (eyebrow, H1, Nepali line, lede, live `BlogSearch`), topic chips (round, mono, centred; topic and search
  keep each other via `routes.blogFind`), a count when filtered, then `BlogCard`s three across (16:9 cover with
  a "N min read" pill, gold mono date, title, summary, topic chips). Post: breadcrumbs → header (topic
  links, H1, summary, mono meta "By · N min read · date · Updated") → credited cover → the article in a
  panel beside a sticky `TocNav` "On this page" (xl+; above the article below xl; the section being read
  gets a gold rule) → the WhatsApp ask → "Keep reading": `listRelated` (most shared tags) in a
  `Carousel` aligned to the narrow container (`carousel-narrow`). Article type (`.prose-article`, shared
  with service/print/film/about/privacy): 18px on a 1.9 line, 36px serif h2, 22px Inter h3.
- **Hero** = the whole first screen (`min-h-[100svh]`), kept light like the portfolio's: centred
  `.hero-mark`, eyebrow (studio · place), H1 "Photos and films for the days you'll want to relive", the
  Nepali line, WhatsApp + films buttons, plain social icons (Facebook, YouTube, WhatsApp), and a desktop
  "Scroll ↓" cue whose arrow bobs down and back (1.8s loop, owner's request; the only looping animation,
  off with reduced motion). No lede paragraph (owner: too heavy). H1 34/44/52px, `text-balance`. Spacing
  is grouped and was measured on screen (visible gaps, not CSS margins): sun + name 14 · name → H1 28 ·
  H1 → Nepali 20 · message → buttons 40 · buttons → icons 24; block centred under the nav. Social icons:
  Facebook, YouTube, WhatsApp (owner wants WhatsApp here too).
- **Tried and rejected (2026-09-27):** a full-bleed photo hero with only "Made to be remembered." and a
  quiet icon-less nav. The owner preferred this version; don't reintroduce it unasked.
- **Nothing may widen the page** (`html { overflow-x: clip }` guards it): on phones a few px of overflow makes
  the browser zoom out, then everything jumps when it snaps back. Things drawn outside a box (the secondary
  button's AF brackets sit 5px outside) must never touch the screen edge. Hero buttons on phones are natural
  width, centred; "Watch our films" is compact (`sprite-btn-compact`: 8px × 16px below sm).
- Mobile: no horizontal overflow at 360px (`min-w-0` on grid children holding scrollers), 44px touch
  targets for buttons, standalone links ≥ 24px tall.

## 5. Language (English + Nepali)

UI copy is English; Nepali is a secondary line, **always inside `lang="ne"`** (MDX: `<Ne>…</Ne>`).
Terms: विवाह = wedding · पास्नी = pasni (rice feeding) · ब्रतबन्ध = bratabandha · चौरासी पूजा = chaurasi puja ·
पञ्चे बाजा = panchebaja · स्याङ्जा = Syangja · अर्जुनचौपारी = Arjunchaupari.

## 6. Films (YouTube)

- Films live in the `films` table. **Dashboard → Films → Sync from YouTube** reads the channel's public feed (its
  newest 15; channel id in Settings) and adds new uploads with a tidied title, a guessed category, a thumbnail built
  like every photo (black bars trimmed) and `curated = false` ("Needs curating"); 6 per click. Older uploads:
  **Add by link** (oEmbed title + the watch page's date). Saving a film marks it curated.
- Curate: site title (keep couples' names as the studio spelled them), category (weddings | ceremonies | culture),
  place, featured (home first), hidden. Renaming a slug adds a redirect automatically; deleting sends the old
  address to /films.
- `scripts/fetch-youtube.py` / `data/films/*.json` / `features/films/data/generated/` only feed the offline
  fallback (no Supabase env) now; `scripts/optimize-images.py` still builds the brand assets.
- `cmmLJ-wB324` ("RAPAKOT TIRSUL", rotated thumbnail) is hidden pending the owner.
- Facebook has no public feed; posting there stays manual until the Supabase dashboard exists.

## 7. Content rules (services, prints, blog)

- **No invented facts about the studio:** no prices, turnaround times, counts ("500 weddings"), years in
  business, awards, ratings or testimonials unless the owner provides them. When unknown, say "ask us".
- Prices are never listed; every offering has a pre-filled WhatsApp `inquiry`.
- **Reviews are real or absent**: copied word for word from Facebook/Google (or given with permission), named as
  the client agreed, linked to the source. Never written by us, never AI avatars (initials only).
- **The founder** (name, portrait, quote, bio) comes from the owner only; until then the studio stands in.
- Service/print copy is a first draft from the old site and the studio's films: the owner should confirm it.
- **Photos:** the studio's own work only (film stills, and its photos once supplied), credited under blog
  covers ("Sunrise Photo Studio, from the film …" + link). Never stock, never AI-generated. People in
  photos are the studio's clients: remove on request (the privacy page promises this).
- Blog posts are written in the dashboard (Blogs): MDX body (`##`/`###` build "On this page"; Nepali inside
  `<Ne>`; photos inserted with the Photo button get the pre-built sizes via the MDX `img` component), status
  draft/published, dates, topics (English, tidied), cover + alt (required with a cover) + credit, SEO fields.
  Reading time and headings are computed on save; a body that doesn't compile can't be saved. Drafts have a
  dashboard preview. Cultural facts (rituals, instruments) are phrased as "usually / in many families".

## 8. SEO (every route)

- `buildPageMetadata` / `buildArticleMetadata` → unique title + description, canonical, OG, Twitter.
- JSON-LD via `<JsonLd>`: home = `WebSite` + `LocalBusiness` (`@id` `/#studio`); contact = `LocalBusiness`;
  services/prints = `Service` (provider → `/#studio`) + `BreadcrumbList`; indexes = `ItemList`; film =
  `VideoObject`; post = `BlogPosting`. No ratings, reviews, prices or hours unless real.
- `app/sitemap.ts` lists every canonical URL. `/films` and `/blogs` are single static pages: `?category=`, `?tag=`
  and `?q=` are applied in the browser (`shared/components/filter/list-filter.tsx`), so every card is in the HTML and
  the canonical is the unfiltered page (no server render or cache entry per query). They page like the portfolio:
  `PagedGrid` (`shared/components/filter/paged-grid.tsx`) shows 12 films / 9 guides, reveals the next batch as
  you near the end (infinite scroll, no request: the cards are already in the HTML), mirrors `?page=N` so back
  lands at the same depth, and shows "12 of 15 films" / "All 15 films". Dashboard lists page on the server
  (`.range()`, 25 per page, Newer/Older).
- Search Console / Bing ownership: meta tags from Settings → Search and sharing. Per-item SEO title/description
  overrides live on each row (`seo_title`, `seo_description`); fixed pages' overrides in the `pages` table.

## 9. Performance

- Server components by default. Client components only: `FloatingNav`, `NavProgress` (the 2px gold top bar on
  navigation and dashboard saves, no glow; `useProgressWhile(busy)` reports work), `YouTubePlayer` (click-to-play
  facade, youtube-nocookie), `BookingForm`, `SplashScreen` (session/skip only), `Carousel`, `Clapper`,
  `SceneLight` / `PendantLamp` / `FilmLight` (light switch, lamp swing, light tilt), `TocNav` (scroll-spy),
  `BlogSearch`, `ListFilterSync` / `PagedGrid` (index filters and paging), `error.tsx`, and the dashboard's form
  widgets. No animation/carousel/lightbox libraries.
- Images are **pre-built, never resized on request**: originals in `assets/images/{blog,films}/` →
  `scripts/optimize-images.py` → `public/images/<collection>/<name>-{480,800,1280}.webp` + `og/<name>.jpg`
  + `features/*/data/generated/images.json`. `next/image` uses `lib/image-loader.ts`. Always pass `sizes`,
  width/height and `placeholder="blur"`; `priority` only on the LCP image. `/images/*` and `/brand/*` are
  cached for a year: **never overwrite an image with a different picture; use a new name.**
- Brand: `assets/brand/sunrise-logo.png` (2000px original) → `public/brand/logo-{80,160}.png`,
  `logo-512.jpg`, `og-default.jpg`, and `app/icon.png`, `apple-icon.png`, `favicon.ico`.
- Analytics: Microsoft Clarity (id in Settings → Search and sharing; `yrjzzytmzi` since 2026-10-03), rendered by
  `SiteAnalytics` in the public layout only (never the dashboard) when `VERCEL_ENV === "production"`. The privacy
  page's "Visitor statistics" section shows while an id is set; keep it true to what loads.

## 10. Workflow and verification

- After changes: `npm run typecheck`, `npm run lint`, and for route/data changes `npm run build`.
- For drawn objects, also check 2x close-up crops of the details (see §3 "Detail"). If you can't view
  images yourself, have a fresh subagent review the screenshots bluntly.
- Look at the result at 1440px and 390px/360px (headless Chrome via the DevTools protocol for widths below
  ~500px), checking for horizontal overflow and small tap targets, and the mobile dock with a
  viewport-sized shot.
  For full-page shots use `captureBeyondViewport` with a clip; don't resize the viewport to the page height
  (the home hero is `100svh` and would stretch). Wait ~4s on / so the splash has finished.
- Keep this file current when a convention changes.

## 11. Backend (Supabase) and the dashboard

- **Schema:** `supabase/migrations/0001_initial_schema.sql` (tables, RLS, storage buckets `media` + `files`),
  content seed `supabase/seeds/0001_content.sql`. Apply with `psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f <file>`.
  Keep `lib/supabase/types.ts` (hand-written) in step with every migration. New migrations: `0002_….sql`, never edit
  an applied one.
- **Access:** public pages read with the publishable key (anon: published rows only). The dashboard reads and writes
  as the signed-in user; writes need `public.is_admin()` (a row in `public.admins`). Supabase sign-ups are open, so
  "authenticated" alone grants nothing. Enquiries are inserted by the server with the secret key after validation,
  honeypot, fill-time check and a per-IP-hash rate limit. Every dashboard page calls `requireAdmin()`, every
  server action `requireAdminAction()` (actions are public endpoints).
- **Caching (the portfolio ran out of Vercel ISR; never repeat it):** every public read is `unstable_cache(fn, [key],
  { tags: [TAG.x] })` from `lib/cache/tags.ts` with **no `revalidate`**, and no page exports `revalidate`/`dynamic`.
  Pages are static and rebuilt only when a dashboard save calls `updateTag(TAG.x)` (or `/api/revalidate` for direct
  DB edits). Detail pages look up slugs in the cached list (never one cache entry per slug) and have no
  `dynamicParams = false` (new slugs render on first visit; missing ones 404 or follow a `redirects` row).
  `proxy.ts` matches `/dashboard` only. Filter/search views are client-side (§8).
- **Images from the dashboard:** `ImageField` → `uploadImage` → `lib/media/process-image.ts` (sharp): 480/800/1280
  WebP + 1200×630 JPEG + blur, unique names in the `media` bucket, a `media` row; the loader serves them like
  `/images/*`. Never on-request resizing; never overwrite a file.
- **Dashboard UI:** same tokens as the site (`features/dashboard/presentation/components/ui.tsx`): `Panel`,
  `PageHeader`, `Field` + `inputClass`, `StatusBadge`, `Stat`; forms are `ActionForm` (server action returning
  `ActionState`, `SubmitButton` = SpriteButton with a pending state); deletes are `ConfirmSubmit` (quiet red text
  that asks first). Tabs in `dashboard-nav.tsx`; add a section to `AVAILABLE` in the protected layout when it exists.
- **Env vars** (local: `.env.local`; production: Vercel project settings): `NEXT_PUBLIC_SITE_URL`,
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only:
  enquiries), optional `REVALIDATE_SECRET`, `CONTACT_HASH_SALT`, `RESEND_API_KEY` + `CONTACT_NOTIFICATION_TO`
  (+ `CONTACT_NOTIFICATION_FROM`) for an email per enquiry. `SUPABASE_DB_URL` is for local psql only.
- **Dashboard sections** (like the portfolio's, with Sunrise's modules): Overview, Messages, Films (sync, add by
  link, curate), Services, Prints (icon picker, sections/FAQ/option editors, film-still pickers, darkroom mock-up),
  Blogs (MDX editor, preview), Reviews, Pages (copy + SEO per page), Root Files (+ IndexNow), File Manager
  (Storage), Settings (Studio · Redirects · Account, "Refresh every page" for direct DB edits). Lists that grow page
  on the server (`Pager`, 20–25 per page). Saving a public item calls `updateTag` for its collection only, and
  `notifyIndexNow(paths)` when it's public. Admin accounts: rows in `public.admins` (the studio's and the developer's).
- **Forms keep what was typed** when a save fails: `ActionForm` (and the contact/login forms) submit through
  `keepValuesOnSubmit` (`shared/hooks/use-keep-values-submit.ts`), skipping React 19's automatic form reset.
- **Root files** (`/<name>.<ext>`: Search Console/Bing verification, ads.txt, the IndexNow key) are served by
  `app/api/root-files/[name]` through a `fallback` rewrite in `next.config.ts` (in-memory cache, no data-cache
  reads; unknown names get a plain 404). **Redirects:** old film/service/print/post slugs redirect at once from the
  detail pages; any other old address comes from `next.config.ts` `redirects()` (read at build), so it starts working
  after the next deploy.
