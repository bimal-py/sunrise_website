-- Dashboard parity with the portfolio: social links, searchable icons, full YouTube sync,
-- binary root files, a merchandise page entry and storage usage for the overview.
-- Additive only: the live site (older code) keeps working against this schema.
begin;

-- Social links (Settings → Social links), like the portfolio. `platform` picks a built-in icon
-- (facebook, youtube, instagram, tiktok, x, linkedin, whatsapp…); `icon_svg` is a chosen icon
-- (Iconify search or a pasted URL), fetched and cleaned on save and drawn as a mask.
create table public.social_links (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform ~ '^[a-z0-9-]{1,40}$'),
  label text not null check (length(label) between 1 and 80),
  url text not null check (url ~ '^https?://' and length(url) <= 500),
  icon_source text not null default '' check (length(icon_source) <= 500),
  icon_svg text check (icon_svg is null or length(icon_svg) <= 20000),
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index social_links_order_idx on public.social_links (sort_order, created_at);
create trigger set_updated_at before update on public.social_links for each row execute function public.set_updated_at();
alter table public.social_links enable row level security;
create policy "Public can read visible social links" on public.social_links for select to anon, authenticated using (is_visible);
create policy "Admins manage social links" on public.social_links for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.social_links from anon, authenticated;
grant select on public.social_links to anon;
grant select, insert, update, delete on public.social_links to authenticated;
grant all on public.social_links to service_role;

-- Start with the two profiles the site already shows.
insert into public.social_links (platform, label, url, sort_order)
select 'facebook', 'Facebook', facebook_url, 10 from public.site_settings where id = 1 and facebook_url <> ''
union all
select 'youtube', 'YouTube', youtube_url, 20 from public.site_settings where id = 1 and youtube_url <> '';

-- Searchable icons for services and prints. `icon` (a lucide name) stays for older code;
-- new code prefers icon_svg when present.
alter table public.services
  add column icon_source text not null default '' check (length(icon_source) <= 500),
  add column icon_svg text check (icon_svg is null or length(icon_svg) <= 20000);
alter table public.prints
  add column icon_source text not null default '' check (length(icon_source) <= 500),
  add column icon_svg text check (icon_svg is null or length(icon_svg) <= 20000);

-- Films: length (VideoObject duration) and whether the sync found it age-restricted.
alter table public.films
  add column duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  add column age_restricted boolean not null default false;

-- YouTube sync: show newly found films on the site at once, or keep them hidden until checked.
alter table public.site_settings
  add column films_auto_publish boolean not null default true,
  add column youtube_synced_at timestamptz;

-- Root files can also be an uploaded file (served from the `files` bucket).
alter table public.root_files
  add column storage_path text check (storage_path is null or (storage_path !~ '\.\.' and length(storage_path) <= 500));

-- The merchandise index gets editable copy and SEO like the other fixed pages.
alter table public.pages drop constraint if exists pages_key_check;
alter table public.pages add constraint pages_key_check
  check (key in ('home', 'services', 'prints', 'films', 'blogs', 'about', 'contact', 'privacy', 'merchandise'));
insert into public.pages (key) values ('merchandise') on conflict (key) do nothing;

-- Storage used per bucket, for the overview (admins only; reads storage.objects directly so the
-- dashboard doesn't walk every folder through the Storage API).
create or replace function public.storage_usage()
returns table (bucket_id text, objects bigint, bytes bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select o.bucket_id, count(*)::bigint, coalesce(sum((o.metadata ->> 'size')::bigint), 0)::bigint
  from storage.objects o
  where public.is_admin()
  group by o.bucket_id;
$$;
revoke execute on function public.storage_usage() from public;
grant execute on function public.storage_usage() to authenticated, service_role;

commit;
