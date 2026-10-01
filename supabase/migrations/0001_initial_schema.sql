-- Sunrise Photo Studio: the whole schema in one migration.
--
-- Apply with:  psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/0001_initial_schema.sql
-- then seed:   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/seeds/0001_content.sql
--
-- Access model
--   * Public pages read with the publishable key (role anon): only published rows.
--   * The dashboard reads and writes as the signed-in user (role authenticated). Writes need
--     public.is_admin(), which checks public.admins. Sign-ups are open on Supabase by default,
--     so "authenticated" alone never grants anything.
--   * Enquiries from the public form are inserted by the server with the secret key (it bypasses
--     RLS after the server action has validated and rate-limited them); anon cannot touch them.

begin;

-- ---------------------------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------------------------

-- Bumps updated_at on every update, unless the statement set it explicitly (so a bulk fix can
-- keep the old date and not tell crawlers that every page changed).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.updated_at is not distinct from old.updated_at then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

-- Dashboard users. A row here is the only thing that grants write access.
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

create policy "Admins can read their own row"
  on public.admins for select to authenticated
  using (user_id = (select auth.uid()));

-- SECURITY DEFINER so policies can call it without recursing through admins' own RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

-- Slugs: lowercase latin words joined by single hyphens.
create domain public.slug as text
  check (value ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(value) <= 120);

-- ---------------------------------------------------------------------------------------------
-- Studio settings (one row)
-- ---------------------------------------------------------------------------------------------

create table public.site_settings (
  id smallint primary key default 1 check (id = 1),

  -- Identity
  name text not null,
  alternate_name text not null default '',
  name_ne text not null default '',
  tagline text not null default '',
  tagline_ne text not null default '',
  description text not null default '',
  footer_blurb text not null default '',
  studio_blurb text not null default '',

  -- Contact
  phone text not null default '',
  whatsapp text not null default '' check (whatsapp ~ '^[0-9]{0,15}$'),
  email text not null default '',

  -- Address
  street text not null default '',
  locality text not null default '',
  district text not null default '',
  region text not null default '',
  country text not null default '',
  country_code text not null default '' check (country_code ~ '^([A-Z]{2})?$'),
  postal_code text not null default '',
  address_line text not null default '',
  address_line_ne text not null default '',
  maps_url text not null default '',
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  area_served text[] not null default '{}',

  -- Social profiles (empty = not shown)
  facebook_url text not null default '',
  youtube_url text not null default '',
  instagram_url text not null default '',
  tiktok_url text not null default '',

  -- YouTube channel the films are synced from
  youtube_channel_id text not null default '',

  -- The founder ("Behind the lens"). Empty name = the studio stands in.
  founder_name text not null default '',
  founder_name_ne text not null default '',
  founder_role text not null default '',
  founder_quote text not null default '',
  founder_bio text not null default '',
  founder_photo jsonb,

  -- Search and sharing
  default_title text not null default '',
  og_image jsonb,
  google_site_verification text not null default '',
  bing_site_verification text not null default '',
  indexnow_key text not null default '' check (indexnow_key ~ '^([A-Za-z0-9-]{8,128})?$'),
  clarity_id text not null default '',

  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------------------------
-- Editable page copy and per-page SEO (fixed set of pages; fields defined in code)
-- ---------------------------------------------------------------------------------------------

create table public.pages (
  key text primary key
    check (key in ('home', 'services', 'prints', 'films', 'blogs', 'about', 'contact', 'privacy')),
  content jsonb not null default '{}'::jsonb check (jsonb_typeof(content) = 'object'),
  body text not null default '',
  seo_title text not null default '',
  seo_description text not null default '',
  og_image jsonb,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------------------------
-- Image library: every processed picture (pre-built 480/800/1280 webp + 1200x630 jpg + blur)
-- ---------------------------------------------------------------------------------------------

create table public.media (
  id uuid primary key default gen_random_uuid(),
  collection text not null check (collection ~ '^[a-z0-9-]{1,40}$'),
  name text not null check (name ~ '^[A-Za-z0-9_-]{1,120}$'),
  -- Logical source the image loader understands ("/images/films/<id>.webp" for files shipped
  -- in /public, or the Storage URL of "<collection>/<name>.webp" for uploads).
  src text not null unique,
  og_src text not null default '',
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  blur_data_url text not null default '',
  alt text not null default '',
  bytes integer not null default 0,
  in_storage boolean not null default true,
  created_at timestamptz not null default now(),
  unique (collection, name)
);

create index media_created_idx on public.media (created_at desc);

-- ---------------------------------------------------------------------------------------------
-- Films (the studio's YouTube uploads, curated)
-- ---------------------------------------------------------------------------------------------

create table public.films (
  youtube_id text primary key check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  slug public.slug not null unique,
  title text not null check (length(title) between 1 and 200),
  youtube_title text not null default '',
  youtube_description text not null default '',
  category text not null check (category in ('weddings', 'ceremonies', 'culture')),
  place text not null default '',
  published_at date not null,
  featured boolean not null default false,
  hidden boolean not null default false,
  -- false = title and category were guessed by the YouTube sync and still need a look.
  curated boolean not null default true,
  thumbnail jsonb,
  seo_title text not null default '',
  seo_description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index films_order_idx on public.films (published_at desc, youtube_id);

-- ---------------------------------------------------------------------------------------------
-- Services and prints (they share the "offering" shape)
-- ---------------------------------------------------------------------------------------------

create table public.prints (
  id uuid primary key default gen_random_uuid(),
  slug public.slug not null unique,
  name text not null check (length(name) between 1 and 160),
  name_ne text not null default '',
  icon text not null default 'Image'
    check (icon in ('Heart', 'Clapperboard', 'Flower2', 'Flame', 'Users', 'IdCard', 'PartyPopper',
                    'BookHeart', 'Frame', 'Image', 'Printer', 'BookImage')),
  summary text not null default '',
  intro text[] not null default '{}',
  sections jsonb not null default '[]'::jsonb check (jsonb_typeof(sections) = 'array'),
  faqs jsonb not null default '[]'::jsonb check (jsonb_typeof(faqs) = 'array'),
  inquiry text not null default '',
  service_type text not null default '',
  featured boolean not null default false,
  highlight text not null default '',
  options_heading text not null default '',
  options jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'),
  -- Which object the home page's darkroom line draws for it (null = not on the line).
  mockup text check (mockup in ('album', 'frame', 'canvas', 'loose-prints', 'book')),
  preview_film_ids text[] not null default '{}',
  og_image jsonb,
  published boolean not null default true,
  sort_order integer not null default 0,
  seo_title text not null default '',
  seo_description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  slug public.slug not null unique,
  name text not null check (length(name) between 1 and 160),
  name_ne text not null default '',
  short_name text not null default '',
  icon text not null default 'Heart'
    check (icon in ('Heart', 'Clapperboard', 'Flower2', 'Flame', 'Users', 'IdCard', 'PartyPopper',
                    'BookHeart', 'Frame', 'Image', 'Printer', 'BookImage')),
  summary text not null default '',
  intro text[] not null default '{}',
  sections jsonb not null default '[]'::jsonb check (jsonb_typeof(sections) = 'array'),
  faqs jsonb not null default '[]'::jsonb check (jsonb_typeof(faqs) = 'array'),
  inquiry text not null default '',
  service_type text not null default '',
  featured boolean not null default false,
  cover_film_id text references public.films (youtube_id) on delete set null,
  film_category text check (film_category in ('weddings', 'ceremonies', 'culture')),
  related_print_ids uuid[] not null default '{}',
  og_image jsonb,
  published boolean not null default true,
  sort_order integer not null default 0,
  seo_title text not null default '',
  seo_description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index services_order_idx on public.services (sort_order, created_at);
create index prints_order_idx on public.prints (sort_order, created_at);

-- ---------------------------------------------------------------------------------------------
-- Blog
-- ---------------------------------------------------------------------------------------------

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  slug public.slug not null unique,
  title text not null check (length(title) between 1 and 200),
  summary text not null default '',
  body text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at date,
  -- The "Updated" date shown on the post (set by hand when the content really changes).
  updated_on date,
  author text not null default '',
  tags text[] not null default '{}',
  language text not null default 'en' check (language in ('en', 'ne')),
  featured boolean not null default false,
  cover jsonb,
  cover_alt text not null default '',
  cover_credit text not null default '',
  cover_credit_url text not null default '',
  cover_license text not null default '',
  cover_license_url text not null default '',
  reading_minutes integer not null default 1 check (reading_minutes >= 1),
  headings jsonb not null default '[]'::jsonb check (jsonb_typeof(headings) = 'array'),
  seo_title text not null default '',
  seo_description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status = 'draft' or published_at is not null)
);

create index posts_order_idx on public.posts (published_at desc, featured desc, created_at desc);

-- ---------------------------------------------------------------------------------------------
-- Reviews (real words from real clients only)
-- ---------------------------------------------------------------------------------------------

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120),
  occasion text not null default '',
  place text not null default '',
  review_month text check (review_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  rating smallint not null default 5 check (rating between 1 and 5),
  body text not null check (length(body) between 1 and 4000),
  source_label text check (source_label in ('Facebook', 'Google', 'YouTube', 'In person')),
  source_url text not null default '',
  published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reviews_order_idx on public.reviews (sort_order, created_at desc);

-- ---------------------------------------------------------------------------------------------
-- Enquiries from the contact form
-- ---------------------------------------------------------------------------------------------

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 100),
  phone text not null default '' check (length(phone) <= 40),
  email text not null default '' check (length(email) <= 200),
  occasion text not null default '' check (length(occasion) <= 80),
  event_date text not null default '' check (length(event_date) <= 60),
  place text not null default '' check (length(place) <= 120),
  message text not null default '' check (length(message) <= 4000),
  source_path text not null default '' check (length(source_path) <= 200),
  status text not null default 'new' check (status in ('new', 'read', 'replied', 'archived')),
  -- Salted hash of the sender's IP, only for rate limiting; never the IP itself.
  ip_hash text,
  user_agent text not null default '' check (length(user_agent) <= 400),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index messages_created_idx on public.messages (created_at desc);
create index messages_status_idx on public.messages (status, created_at desc);
create index messages_ip_idx on public.messages (ip_hash, created_at desc);

-- ---------------------------------------------------------------------------------------------
-- Root files: small text files served at the site root (Search Console / Bing verification,
-- ads.txt, ...). Only names with an extension reach them (see next.config.ts rewrites).
-- ---------------------------------------------------------------------------------------------

create table public.root_files (
  id uuid primary key default gen_random_uuid(),
  file_name text not null unique
    check (file_name ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,99}\.[A-Za-z0-9]{1,8}$'),
  content_type text not null default 'text/plain; charset=utf-8',
  body text not null default '' check (length(body) <= 200000),
  published boolean not null default true,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------------------------
-- Redirects (old URLs → new ones). Renaming a slug in the dashboard adds one automatically.
-- ---------------------------------------------------------------------------------------------

create table public.redirects (
  id uuid primary key default gen_random_uuid(),
  source text not null unique check (source ~ '^/[^\s?#]*$' and length(source) <= 300),
  destination text not null check (destination ~ '^(/|https?://)' and length(destination) <= 500),
  permanent boolean not null default true,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (source <> destination)
);

-- ---------------------------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------------------------

create trigger set_updated_at before update on public.site_settings for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.pages for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.films for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.services for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.prints for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.posts for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.reviews for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.messages for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.root_files for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.redirects for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------------------------

alter table public.site_settings enable row level security;
alter table public.pages enable row level security;
alter table public.media enable row level security;
alter table public.films enable row level security;
alter table public.services enable row level security;
alter table public.prints enable row level security;
alter table public.posts enable row level security;
alter table public.reviews enable row level security;
alter table public.messages enable row level security;
alter table public.root_files enable row level security;
alter table public.redirects enable row level security;

-- Public reads (what the website shows)
create policy "Public can read settings" on public.site_settings for select to anon, authenticated using (true);
create policy "Public can read pages" on public.pages for select to anon, authenticated using (true);
create policy "Public can read media" on public.media for select to anon, authenticated using (true);
create policy "Public can read visible films" on public.films for select to anon, authenticated using (hidden = false);
create policy "Public can read published services" on public.services for select to anon, authenticated using (published);
create policy "Public can read published prints" on public.prints for select to anon, authenticated using (published);
create policy "Public can read published posts" on public.posts for select to anon, authenticated using (status = 'published');
create policy "Public can read published reviews" on public.reviews for select to anon, authenticated using (published);
create policy "Public can read published root files" on public.root_files for select to anon, authenticated using (published);
create policy "Public can read redirects" on public.redirects for select to anon, authenticated using (true);

-- Admins manage everything (these also let admins read drafts, hidden films and messages)
create policy "Admins manage settings" on public.site_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage pages" on public.pages for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage media" on public.media for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage films" on public.films for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage services" on public.services for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage prints" on public.prints for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage posts" on public.posts for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage reviews" on public.reviews for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage messages" on public.messages for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage root files" on public.root_files for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage redirects" on public.redirects for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Table privileges: anon may only read; authenticated may write (RLS limits writes to admins).
revoke all on all tables in schema public from anon, authenticated;
grant select on public.site_settings, public.pages, public.media, public.films, public.services,
  public.prints, public.posts, public.reviews, public.root_files, public.redirects to anon;
grant select, insert, update, delete on public.site_settings, public.pages, public.media,
  public.films, public.services, public.prints, public.posts, public.reviews, public.messages,
  public.root_files, public.redirects to authenticated;
grant select on public.admins to authenticated;
grant all on all tables in schema public to service_role;

-- ---------------------------------------------------------------------------------------------
-- Storage: "media" holds processed images, "files" anything else (PDFs, ...). Both public, so
-- objects are served by URL; listing and writing are admin-only.
-- ---------------------------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('media', 'media', true, 10485760, array['image/webp', 'image/jpeg', 'image/png', 'image/avif', 'image/gif']),
  ('files', 'files', true, 26214400, null)
on conflict (id) do nothing;

create policy "Admins can list site files" on storage.objects for select to authenticated
  using (bucket_id in ('media', 'files') and public.is_admin());
create policy "Admins can upload site files" on storage.objects for insert to authenticated
  with check (bucket_id in ('media', 'files') and public.is_admin());
create policy "Admins can update site files" on storage.objects for update to authenticated
  using (bucket_id in ('media', 'files') and public.is_admin())
  with check (bucket_id in ('media', 'files') and public.is_admin());
create policy "Admins can delete site files" on storage.objects for delete to authenticated
  using (bucket_id in ('media', 'files') and public.is_admin());

commit;
