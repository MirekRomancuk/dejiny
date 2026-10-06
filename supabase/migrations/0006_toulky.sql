-- 0006_toulky.sql
-- Add separate toulky_url column (Český rozhlas Dvojka — Toulky českou minulostí).
-- Previously this URL was concatenated into content_html during the Joomla migration.

alter table public.events add column if not exists toulky_url text;

-- Backfill: extract dvojka.rozhlas.cz URLs from content_html and move them to toulky_url.
-- We look for the pattern "https://dvojka.rozhlas.cz/..." in a paragraph or on its own line.
update public.events
set toulky_url = matches[1],
    content_html = regexp_replace(
      content_html,
      E'\\s*<p[^>]*>\\s*(https?://dvojka\\.rozhlas\\.cz/[^<\\s]+)\\s*</p>\\s*',
      '',
      'g'
    )
from (
  select id, regexp_matches(content_html, 'https?://dvojka\.rozhlas\.cz/[^\s<"]+', 'g') as matches
  from public.events
) m
where m.id = events.id;

-- Also strip standalone toulky URLs (not wrapped in <p>) just in case
update public.events
set content_html = regexp_replace(content_html, 'https?://dvojka\.rozhlas\.cz/[^\s<"]+', '', 'g')
where content_html ~ 'dvojka\.rozhlas\.cz';
