-- 0002_rls.sql
-- Row Level Security: public read on all tables; write only for authenticated users.

alter table public.events          enable row level security;
alter table public.event_types     enable row level security;
alter table public.rulers          enable row level security;
alter table public.pages           enable row level security;
alter table public.calendar_events enable row level security;
alter table public.settings        enable row level security;

-- ============================================================
-- SELECT policies (public, anon + authenticated)
-- ============================================================
create policy "events_select_public"  on public.events          for select using (true);
create policy "types_select_public"   on public.event_types     for select using (true);
create policy "rulers_select_public"  on public.rulers          for select using (true);
create policy "pages_select_public"   on public.pages           for select using (true);
create policy "calendar_select_public" on public.calendar_events for select using (true);
create policy "settings_select_public" on public.settings       for select using (true);

-- ============================================================
-- INSERT / UPDATE / DELETE (authenticated only)
-- ============================================================
create policy "events_write_auth"    on public.events          for all to authenticated using (true) with check (true);
create policy "types_write_auth"     on public.event_types     for all to authenticated using (true) with check (true);
create policy "rulers_write_auth"    on public.rulers          for all to authenticated using (true) with check (true);
create policy "pages_write_auth"     on public.pages           for all to authenticated using (true) with check (true);
create policy "calendar_write_auth"  on public.calendar_events for all to authenticated using (true) with check (true);
create policy "settings_write_auth"  on public.settings        for all to authenticated using (true) with check (true);
