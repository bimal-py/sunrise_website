# Sunrise Photo Digital Studio

Premium, SEO-friendly Astro website scaffold for `sunrisedigitalphotostudio.com.np`, designed for dynamic family-managed content with Sanity.

## Stack

- Astro for the frontend
- Sanity for CMS-managed content
- Static hosting on Cloudflare Pages
- WhatsApp/email inquiry flow instead of payment gateway

## Project Structure

```text
src/
  core/
    config/
    sanity/
    seo/
  features/
    contact/
    gallery/
    home/
    merchandise/
    services/
    shared/
    videos/
  layouts/
  pages/
  styles/
sanity/
  schemaTypes/
```

## What Is Ready

- Premium black/gold sunrise theme
- SEO metadata layout and local business schema
- Home, services, gallery, videos, merchandise, about, and contact pages
- Feature-based architecture with clean separation
- Sanity schema set for content management
- Local fallback content so the site can render before Sanity is connected

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment file:

```bash
cp .env.example .env
```

3. Fill in:

- `PUBLIC_SANITY_PROJECT_ID`
- `PUBLIC_SANITY_DATASET`
- `SANITY_STUDIO_PROJECT_ID`
- `SANITY_STUDIO_DATASET`

4. Run the website:

```bash
npm run dev
```

5. Run Sanity Studio:

```bash
npm run studio
```

## Performance Guidance

- Upload optimized web images to Sanity, not raw originals
- Use YouTube and Facebook embeds for long videos
- Keep self-hosted video clips short and compressed
- Add pagination or filters when your gallery grows large

## Important Notes

- The contact form currently uses `FormSubmit` placeholder action in `src/features/contact/data/content.ts`
- Update phone, email, address, social links, and WhatsApp number in `src/core/config/site.ts`
- Replace placeholder gallery/video entries with your actual content in Sanity

## Suggested Deployment

- Host the Astro frontend on Cloudflare Pages
- Point `sunrisedigitalphotostudio.com.np` to Cloudflare
- Keep Sanity as the content backend for your family
