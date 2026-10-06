-- 0008_page_blocks.sql
-- Strukturované komponenty veřejných stránek (Popis, Vysvětlivky, Verze).
-- Nahrazuje editaci jednoho HTML blobu granulární editací po komponentách.
-- `content_html` na `pages` zůstává jako záloha; obsah se do bloků přenese
-- jednorázovým skriptem scripts/migrate-pages-to-blocks.ts.

create table if not exists public.page_blocks (
  id          bigserial primary key,
  page_slug   text not null,
  kind        text not null,
  position    integer not null default 0,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists page_blocks_slug_pos_idx
  on public.page_blocks (page_slug, position);

alter table public.page_blocks enable row level security;

-- Veřejné čtení (jako ostatní tabulky).
drop policy if exists "page_blocks_select_public" on public.page_blocks;
create policy "page_blocks_select_public"
  on public.page_blocks for select using (true);

-- Zápis jen pro přihlášeného admina (is_admin()).
drop policy if exists "page_blocks_write_admin" on public.page_blocks;
create policy "page_blocks_write_admin"
  on public.page_blocks for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
