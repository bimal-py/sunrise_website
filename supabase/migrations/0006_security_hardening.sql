-- Security hardening and honest "last modified" dates.
-- Additive for the live site (older code on main): nothing public reads `media`, the message
-- trigger's limits sit above the app's own, and the updated_at triggers only stop re-dating
-- rows whose saves changed nothing.
begin;

-- 1. The media library is for admins only (pages store each photo's address themselves).
drop policy if exists "Public can read media" on public.media;
revoke select on public.media from anon;

-- 2. The storage overview is for admins: Supabase grants new functions to anon directly, so
-- 0005's "revoke … from public" left anon's grant in place.
revoke execute on function public.storage_usage() from anon;

-- 3. Tables, sequences and functions made by later migrations get no anon/authenticated rights
-- unless the migration grants them (every migration revokes and grants explicitly).
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;

-- 4. Re-date a row only when a save changed something, so the sitemap's lastmod stays honest
-- (a YouTube resync or an untouched Save no longer re-dates every film).
do $$
declare t text;
begin
  foreach t in array array['films', 'messages', 'pages', 'posts', 'prints', 'product_categories', 'products', 'redirects',
                           'reviews', 'root_files', 'services', 'site_settings', 'social_links'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row
                    when (old.* is distinct from new.*) execute function public.set_updated_at()', t);
  end loop;
end $$;

-- 5. Messages (enquiries and orders): the per-sender limit enforced atomically, so parallel posts
-- can't all slip past the app's count-then-insert, plus a site-wide ceiling for the email quota.
-- The app's own limit (3 per sender per 10 minutes) answers first; this is the backstop.
create or replace function public.messages_rate_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.ip_hash is not null then
    perform pg_advisory_xact_lock(hashtext('messages:' || new.ip_hash));
    if (select count(*) from public.messages
          where ip_hash = new.ip_hash and created_at > now() - interval '10 minutes') >= 5 then
      raise exception 'rate_limited' using errcode = 'P0001';
    end if;
  end if;
  if (select count(*) from public.messages where created_at > now() - interval '1 hour') >= 120 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return new;
end
$$;
revoke execute on function public.messages_rate_limit() from public, anon, authenticated;
create trigger messages_rate_limit before insert on public.messages
  for each row execute function public.messages_rate_limit();

-- 6. Failed sign-ins (secret key only). Supabase sees the server's address, not the visitor's,
-- so the login action counts recent failures per visitor and per email (salted hashes) itself.
create table public.login_attempts (
  id uuid primary key default gen_random_uuid(),
  key_hash text not null check (length(key_hash) between 16 and 128),
  created_at timestamptz not null default now()
);
create index login_attempts_key_idx on public.login_attempts (key_hash, created_at desc);
alter table public.login_attempts enable row level security;
revoke all on public.login_attempts from anon, authenticated;
grant all on public.login_attempts to service_role;

commit;
