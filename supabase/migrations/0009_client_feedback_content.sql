-- Připomínky klienta: Popis, Vysvětlivky, vlastní pořadí literatury
-- a finální Joomla dataset Událostí.
--
-- Ne-Joomla události se mažou pouze při přesně ověřeném počtu a až po
-- obsahově shodné záloze v neveřejném schématu `private`.

begin;

-- Během krátké obsahové migrace nepřipusť souběžnou inline editaci bloků.
lock table public.page_blocks in share row exclusive mode;

-- POPIS: odstraň duplicitní nadpis pod vysvětlivkami a připoj cílovou mapu.
update public.page_blocks
set data = jsonb_set(
      data,
      '{bodyHtml}',
      to_jsonb(
        regexp_replace(
          data ->> 'bodyHtml',
          '<p[^>]*><span[^>]*>Mapa s místy uvedenými v Událostech</span></p>',
          '',
          'i'
        )
      )
    ),
    updated_at = now()
where page_slug = 'popis'
  and kind = 'popis_section'
  and data ->> 'heading' = 'VYSVĚTLIVKY'
  and data ->> 'bodyHtml' ilike '%Mapa s místy uvedenými v Událostech%';

update public.page_blocks
set data = data || jsonb_build_object(
      'mapUrl',
      'https://www.google.com/maps/d/viewer?mid=1GWeRf4RDw8LxCaRIxVxeaS0Z_5HJD5c&ll=49.89364478744786%2C15.289757450000003&z=8'
    ),
    updated_at = now()
where page_slug = 'popis'
  and kind = 'popis_map';

-- VYSVĚTLIVKY: tři řádky patří k zápisu datumů a období. Sémantické
-- párování funguje před migrací i po jejím opakovaném spuštění.
with moved_dates (format, description) as (
  values
    ('I. - XII.', 'známý pouze kalendářní měsíc události (leden - prosinec)'),
    ('J;L;P;Z', 'známé pouze roční období události (jaro, léto, podzim, zima)'),
    ('1.-6.9.; III.-VI.; L-P; 1100-1101', 'intervaly období událostí (dny, měsíce, roční období, roky)')
)
update public.page_blocks as block
set kind = 'legend_date_format',
    data = jsonb_build_object('format', moved.format, 'description', moved.description),
    updated_at = now()
from moved_dates as moved
where block.page_slug = 'vysvetlivky'
  and (
    (block.kind = 'legend_column' and block.data ->> 'term' = moved.format)
    or
    (block.kind = 'legend_date_format' and block.data ->> 'format' = moved.format)
  );

-- Ve stavotvorném obdélníku se zobrazí český a moravský znak společně.
update public.page_blocks
set data = data || jsonb_build_object(
      'imageUrl2',
      'https://hujighhlnmuokjvtveru.supabase.co/storage/v1/object/public/event-images/male_obrazky/Znak_Morava_60.png'
    ),
    updated_at = now()
where page_slug = 'vysvetlivky'
  and kind = 'legend_icon'
  and data ->> 'imageUrl' ilike '%/Znak_Pemyslovci75.png';

-- Obnov pořadí původní stránky bez závislosti na databázových ID.
with block_keys as (
  select
    id,
    case
      when kind = 'legend_column' then 'column:' || coalesce(data ->> 'term', '')
      when kind = 'legend_icon' and data ->> 'imageUrl' ilike '%Palec_nahoru%' then 'icon:thumb-up'
      when kind = 'legend_icon' and data ->> 'imageUrl' ilike '%Palec_dol%' then 'icon:thumb-down'
      when kind = 'legend_icon' and data ->> 'imageUrl' ilike '%Znak_Pemyslovci75%' then 'icon:statehood'
      when kind = 'legend_icon' and data ->> 'imageUrl' ilike '%Mee_100%' then 'icon:battle'
      when kind = 'legend_icon' and data ->> 'imageUrl' ilike '%Dka_50%' then 'icon:betrayal'
      when kind = 'legend_text_color' and data ->> 'descriptionHtml' ilike '%kladné%' then 'text:positive'
      when kind = 'legend_text_color' and data ->> 'descriptionHtml' ilike '%záporné%' then 'text:negative'
      when kind = 'legend_date_format' then 'date:' || coalesce(data ->> 'format', '')
      when kind = 'legend_external_link' then 'external:' || coalesce(data ->> 'icon', '')
      else null
    end as semantic_key
  from public.page_blocks
  where page_slug = 'vysvetlivky'
),
desired_positions (semantic_key, position) as (
  values
    ('column:ROK', 0),
    ('column:PANOVNÍK', 1),
    ('column:POLITIKA A VÝZNAMNÉ UDÁLOSTI V ZAHRANIČÍ', 2),
    ('column:POLITIKA A VÝZNAMNÉ UDÁLOSTI DOMÁCÍ', 3),
    ('column:VZDĚLANOST A UMĚNÍ', 4),
    ('column:OSOBNOSTI', 5),
    ('column:MÍSTA', 6),
    ('icon:thumb-up', 7),
    ('icon:thumb-down', 8),
    ('icon:statehood', 9),
    ('icon:battle', 10),
    ('icon:betrayal', 11),
    ('text:positive', 12),
    ('text:negative', 13),
    ('date:12.3.', 14),
    ('date:I. - XII.', 15),
    ('date:J;L;P;Z', 16),
    ('date:4.7. n. 5.8.; I. n. II.; 1100 n. 1101', 17),
    ('date:1.-6.9.; III.-VI.; L-P; 1100-1101', 18),
    ('date:n. 487', 19),
    ('date:před t.r.; před 30.6.', 20),
    ('date:do t.r.', 21),
    ('date:okolo t.r.', 22),
    ('date:poč. r.', 23),
    ('date:pol. r.; 2 pol. r.; pol. VII.; 2 pol. II.', 24),
    ('date:kon. r.; kon. L; kon. IX.', 25),
    ('date:po t.r.', 26),
    ('date:až 681; až 30.6.; až VII.', 27),
    ('date:asi', 28),
    ('external:wikipedia', 29),
    ('external:mapy', 30),
    ('external:galerie', 31),
    ('external:radio', 32)
)
update public.page_blocks as block
set position = desired.position,
    updated_at = now()
from block_keys as keyed
join desired_positions as desired using (semantic_key)
where block.id = keyed.id;

-- Přeruš transakci, pokud se některá očekávaná obsahová změna neprovedla.
do $$
declare
  matched_count bigint;
  distinct_positions bigint;
begin
  if exists (select 1 from public.page_blocks where page_slug = 'popis') then
    select count(*) into matched_count
    from public.page_blocks
    where page_slug = 'popis'
      and kind = 'popis_map'
      and data ->> 'mapUrl' = 'https://www.google.com/maps/d/viewer?mid=1GWeRf4RDw8LxCaRIxVxeaS0Z_5HJD5c&ll=49.89364478744786%2C15.289757450000003&z=8';
    if matched_count <> 1 then
      raise exception 'Očekávána právě jedna mapa Popisu s cílovou viewer URL, nalezeno %.', matched_count;
    end if;

    if exists (
      select 1 from public.page_blocks
      where page_slug = 'popis'
        and kind = 'popis_section'
        and data ->> 'bodyHtml' ilike '%Mapa s místy uvedenými v Událostech%'
    ) then
      raise exception 'Duplicitní text mapy zůstal v některém bloku Popisu.';
    end if;
  end if;

  if exists (select 1 from public.page_blocks where page_slug = 'vysvetlivky') then
    if exists (
      select 1 from public.page_blocks
      where page_slug = 'vysvetlivky'
        and kind = 'legend_column'
        and data ->> 'term' in ('I. - XII.', 'J;L;P;Z', '1.-6.9.; III.-VI.; L-P; 1100-1101')
    ) then
      raise exception 'Některý přesouvaný formát data zůstal mezi sloupci.';
    end if;

    select count(*), count(distinct position)
    into matched_count, distinct_positions
    from public.page_blocks
    where page_slug = 'vysvetlivky'
      and kind = 'legend_date_format'
      and position between 14 and 28;
    if matched_count <> 15 or distinct_positions <> 15 then
      raise exception 'Očekáváno 15 jednoznačně seřazených formátů data, nalezeno % (% pozic).', matched_count, distinct_positions;
    end if;

    select count(*) into matched_count
    from public.page_blocks
    where page_slug = 'vysvetlivky'
      and kind = 'legend_icon'
      and data ->> 'imageUrl' ilike '%/Znak_Pemyslovci75.png'
      and data ->> 'imageUrl2' ilike '%/Znak_Morava_60.png';
    if matched_count <> 1 then
      raise exception 'Český a moravský znak nejsou spárovány v právě jednom bloku.';
    end if;
  end if;
end
$$;

-- Doplň reprodukovatelnou definici tabulky literatury, která na živém projektu
-- již existuje, ale ve starším migračním řetězci chyběla.
create table if not exists public.bibliography (
  id            bigserial primary key,
  author        text not null,
  title         text not null,
  year          integer,
  image_url     text,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists bibliography_display_order_idx
  on public.bibliography (display_order, id);

create or replace function public.bibliography_touch_updated()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

drop trigger if exists trg_bibliography_touch on public.bibliography;
create trigger trg_bibliography_touch
  before update on public.bibliography
  for each row execute function public.bibliography_touch_updated();

alter table public.bibliography enable row level security;

-- Odstraň případné historické politiky a nastav jediný známý model oprávnění.
do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'bibliography'
  loop
    execute format('drop policy %I on public.bibliography', existing_policy.policyname);
  end loop;
end
$$;

create policy "bibliography_select_public"
  on public.bibliography for select using (true);

create policy "bibliography_write_admin"
  on public.bibliography for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on table public.bibliography to anon, authenticated;
grant insert, update, delete on table public.bibliography to authenticated;
grant all on table public.bibliography to service_role;

do $$
declare
  id_sequence text;
begin
  id_sequence := pg_get_serial_sequence('public.bibliography', 'id');
  if id_sequence is not null then
    execute format('grant usage, select on sequence %s to authenticated, service_role', id_sequence);
  end if;
end
$$;

-- Atomické operace pro vlastní pořadí literatury. Funkce běží s právy
-- přihlášeného uživatele a výslovně vyžadují admin profil.
create or replace function public.swap_bibliography_display_order(first_id bigint, second_id bigint)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  first_order integer;
  second_order integer;
  affected_rows integer;
begin
  if not public.is_admin() then
    raise exception 'Admin oprávnění je vyžadováno.' using errcode = '42501';
  end if;
  if first_id = second_id then
    raise exception 'Nelze prohodit položku samu se sebou.';
  end if;

  perform pg_advisory_xact_lock(hashtext('bibliography-display-order'));

  select display_order into strict first_order
  from public.bibliography
  where id = first_id
  for update;

  select display_order into strict second_order
  from public.bibliography
  where id = second_id
  for update;

  update public.bibliography
  set display_order = case id
        when first_id then second_order
        when second_id then first_order
      end,
      updated_at = now()
  where id in (first_id, second_id);

  get diagnostics affected_rows = row_count;
  if affected_rows <> 2 then
    raise exception 'Pořadí nebylo prohozeno pro oba záznamy.';
  end if;
end
$$;

create or replace function public.append_bibliography_entry(
  p_author text,
  p_title text,
  p_year integer,
  p_image_url text
)
returns bigint
language plpgsql
security invoker
set search_path = public
as $$
declare
  new_id bigint;
begin
  if not public.is_admin() then
    raise exception 'Admin oprávnění je vyžadováno.' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtext('bibliography-display-order'));

  insert into public.bibliography (author, title, year, image_url, display_order)
  select p_author, p_title, p_year, p_image_url, coalesce(max(display_order), -1) + 1
  from public.bibliography
  returning id into new_id;

  return new_id;
end
$$;

revoke all on function public.swap_bibliography_display_order(bigint, bigint) from public;
revoke all on function public.append_bibliography_entry(text, text, integer, text) from public;
grant execute on function public.swap_bibliography_display_order(bigint, bigint) to authenticated, service_role;
grant execute on function public.append_bibliography_entry(text, text, integer, text) to authenticated, service_role;

-- UDÁLOSTI: před smazáním ověř přesný schválený rozsah 2 009 řádků.
-- Zámek zabrání vložení či změně řádku mezi kontrolou zálohy a DELETE.
lock table public.events in share row exclusive mode;

do $$
declare
  non_joomla_count bigint;
begin
  select count(*) into non_joomla_count
  from public.events
  where source_joomla_id is null;

  if non_joomla_count not in (0, 2009) then
    raise exception 'Očekáváno 2 009 ne-Joomla událostí (nebo 0 po migraci), nalezeno %.', non_joomla_count;
  end if;
end
$$;

create schema if not exists private;

create table if not exists private.events_non_joomla_backup_20260821
  (like public.events including all);

comment on table private.events_non_joomla_backup_20260821 is
  'Obnovitelná záloha událostí bez source_joomla_id před klientem schváleným úklidem 2026-08-21.';

-- Při opakování obnov shodu řádků, které v živé tabulce ještě existují.
delete from private.events_non_joomla_backup_20260821 as backup
using public.events as event
where backup.id = event.id
  and event.source_joomla_id is null;

insert into private.events_non_joomla_backup_20260821
select *
from public.events
where source_joomla_id is null;

do $$
declare
  mismatched_backup_count bigint;
begin
  select count(*)
  into mismatched_backup_count
  from public.events as event
  left join private.events_non_joomla_backup_20260821 as backup using (id)
  where event.source_joomla_id is null
    and (
      backup.id is null
      or to_jsonb(event) is distinct from to_jsonb(backup)
    );

  if mismatched_backup_count <> 0 then
    raise exception 'Ne-Joomla události nejsou obsahově shodně zálohované (% chybí nebo se liší).', mismatched_backup_count;
  end if;
end
$$;

delete from public.events
where source_joomla_id is null;

do $$
begin
  if exists (select 1 from public.events where source_joomla_id is null) then
    raise exception 'Po úklidu stále existují události bez Joomla zdroje.';
  end if;
end
$$;

commit;
