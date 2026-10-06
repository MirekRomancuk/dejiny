-- 0001_init.sql
-- Schema for Dějiny Koruny české
-- Tables: event_types, rulers, events, pages, calendar_events, settings

create extension if not exists pg_trgm;
create extension if not exists unaccent;

-- ============================================================
-- event_types: enumerace typů událostí (zahraničí / domácí / umění / …)
-- ============================================================
create table public.event_types (
  id            smallserial primary key,
  code          text unique not null,
  label         text not null,
  display_order smallint not null default 0
);

insert into public.event_types (code, label, display_order) values
  ('foreign',  'Politika a významné události v zahraničí', 10),
  ('domestic', 'Politika a významné události domácí',      20),
  ('arts',     'Vzdělanost - umění',                       30),
  ('citation', 'Citáty a obrazové přílohy',                40),
  ('person',   'Osobnost',                                 50),
  ('place',    'Místo',                                    60),
  ('other',    'Ostatní',                                  90);

-- ============================================================
-- rulers: číselník panovníků
-- ============================================================
create table public.rulers (
  id            smallserial primary key,
  name          text unique not null,
  dynasty       text,
  year_from     integer,
  year_to       integer,
  display_order integer
);
create index rulers_year_idx on public.rulers (year_from, year_to);

-- ============================================================
-- events: 1 řádek = 1 událost (Joomla-style)
-- ============================================================
create table public.events (
  id                bigserial primary key,
  year_text         text,
  year_numeric      integer,
  ruler_id          smallint references public.rulers(id) on delete set null,
  type_id           smallint not null references public.event_types(id) on delete restrict,
  date_text         text,
  month             smallint check (month is null or (month between 1 and 12)),
  content_html      text not null default '',
  wiki_url          text,
  wiki_label        text,
  maps_url          text,
  maps_label        text,
  osobnost          text,
  poznamka          text,
  image_refs        jsonb not null default '[]'::jsonb,
  show_in_calendar  boolean not null default false,
  calendar_text     text,
  ordering          integer not null default 0,
  source_joomla_id  integer,
  source_excel_row  integer,
  search_tsv        tsvector,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index events_year_idx       on public.events (year_numeric, type_id, ordering);
create index events_ruler_idx      on public.events (ruler_id);
create index events_type_idx       on public.events (type_id);
create index events_calendar_idx   on public.events (month) where show_in_calendar = true;
create index events_search_tsv_idx on public.events using gin (search_tsv);
create unique index events_joomla_uniq_idx on public.events (source_joomla_id) where source_joomla_id is not null;

-- search_tsv trigger
create or replace function public.events_tsv_update() returns trigger language plpgsql as $$
begin
  new.search_tsv := to_tsvector('simple', unaccent(
    coalesce(new.year_text, '')   || ' ' ||
    coalesce(new.date_text, '')   || ' ' ||
    coalesce(new.content_html, '') || ' ' ||
    coalesce(new.osobnost, '')    || ' ' ||
    coalesce(new.poznamka, '')    || ' ' ||
    coalesce(new.wiki_label, '')  || ' ' ||
    coalesce(new.maps_label, '')  || ' ' ||
    coalesce(new.calendar_text, '')
  ));
  new.updated_at := now();
  return new;
end$$;

create trigger trg_events_tsv
  before insert or update on public.events
  for each row execute function public.events_tsv_update();

-- ============================================================
-- pages: CMS stránky (Popis / Vysvětlivky / Verze / Kalendář / Home)
-- ============================================================
create table public.pages (
  id           bigserial primary key,
  slug         text unique not null,
  title        text not null,
  content_html text not null default '',
  background   jsonb not null default '{"type":"color","value":"hsl(36 33% 92%)"}'::jsonb,
  updated_at   timestamptz not null default now()
);

create or replace function public.pages_touch_updated() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end$$;
create trigger trg_pages_touch before update on public.pages
  for each row execute function public.pages_touch_updated();

-- Seed placeholderů (klient si je v adminu nahradí, Joomla migrace nahradí obsah)
insert into public.pages (slug, title, content_html) values
  ('home',         'Vítejte',     ''),
  ('popis',        'Popis',       ''),
  ('vysvetlivky',  'Vysvětlivky', ''),
  ('verze',        'Verze',       ''),
  ('kalendar',     'Kalendář',    '')
on conflict (slug) do nothing;

-- ============================================================
-- calendar_events: denní záznamy pro stránku Kalendář
-- ============================================================
create table public.calendar_events (
  id              bigserial primary key,
  day             smallint not null check (day between 1 and 31),
  month           smallint not null check (month between 1 and 12),
  year_text       text,
  title           text not null,
  description_html text,
  created_at      timestamptz not null default now()
);
create index calendar_month_day_idx on public.calendar_events (month, day);

-- ============================================================
-- settings: globální key-value
-- ============================================================
create table public.settings (
  key   text primary key,
  value jsonb not null
);

insert into public.settings (key, value) values
  ('site_title', '"Dějiny Koruny české"'::jsonb),
  ('footer_text', '"© Dějiny Koruny české"'::jsonb),
  ('default_columns', '["foreign","domestic","arts","citation","person","place"]'::jsonb)
on conflict do nothing;
