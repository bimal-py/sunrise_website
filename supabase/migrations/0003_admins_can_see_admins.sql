-- Settings → Account lists everyone who can sign in to the dashboard.
begin;
create policy "Admins can read the admin list" on public.admins for select to authenticated using (public.is_admin());
commit;
