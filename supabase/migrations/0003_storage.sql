-- 0003_storage.sql
-- Storage buckets a policies pro obrázky/přílohy.

insert into storage.buckets (id, name, public)
values
  ('event-images',     'event-images',     true),
  ('page-content',     'page-content',     true),
  ('page-backgrounds', 'page-backgrounds', true)
on conflict (id) do nothing;

-- Public read for all three buckets
create policy "public_read_event_images"
  on storage.objects for select
  using (bucket_id = 'event-images');

create policy "public_read_page_content"
  on storage.objects for select
  using (bucket_id = 'page-content');

create policy "public_read_page_backgrounds"
  on storage.objects for select
  using (bucket_id = 'page-backgrounds');

-- Authenticated write (insert/update/delete) for all three
create policy "auth_write_event_images"
  on storage.objects for all to authenticated
  using (bucket_id = 'event-images')
  with check (bucket_id = 'event-images');

create policy "auth_write_page_content"
  on storage.objects for all to authenticated
  using (bucket_id = 'page-content')
  with check (bucket_id = 'page-content');

create policy "auth_write_page_backgrounds"
  on storage.objects for all to authenticated
  using (bucket_id = 'page-backgrounds')
  with check (bucket_id = 'page-backgrounds');
