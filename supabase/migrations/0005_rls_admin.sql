-- 0005_rls_admin.sql
-- Tighten write policies: only is_admin() may write to events / pages / etc.
-- Public SELECT remains open for all.

-- Drop old "authenticated user can do anything" policies
drop policy if exists "events_write_auth"   on public.events;
drop policy if exists "types_write_auth"    on public.event_types;
drop policy if exists "rulers_write_auth"   on public.rulers;
drop policy if exists "pages_write_auth"    on public.pages;
drop policy if exists "calendar_write_auth" on public.calendar_events;
drop policy if exists "settings_write_auth" on public.settings;

-- New policies require is_admin()
create policy "events_write_admin"
  on public.events for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "types_write_admin"
  on public.event_types for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "rulers_write_admin"
  on public.rulers for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "pages_write_admin"
  on public.pages for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "calendar_write_admin"
  on public.calendar_events for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "settings_write_admin"
  on public.settings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Storage: same upgrade - require is_admin (not just authenticated)
drop policy if exists "auth_write_event_images"     on storage.objects;
drop policy if exists "auth_write_page_content"     on storage.objects;
drop policy if exists "auth_write_page_backgrounds" on storage.objects;

create policy "admin_write_event_images"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'event-images' and public.is_admin())
  with check (bucket_id = 'event-images' and public.is_admin());

create policy "admin_write_page_content"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'page-content' and public.is_admin())
  with check (bucket_id = 'page-content' and public.is_admin());

create policy "admin_write_page_backgrounds"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'page-backgrounds' and public.is_admin())
  with check (bucket_id = 'page-backgrounds' and public.is_admin());
