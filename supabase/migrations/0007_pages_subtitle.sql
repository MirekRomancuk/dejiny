-- 0007_pages_subtitle.sql
-- Přidá sloupec `subtitle` pro editovatelný podtitulek v hlavičce (HeroHeader).
-- Titulek (title) i podtitulek se nově čtou z DB s fallbackem na dřívější
-- napevno psané řetězce. Seed níže nastaví stávající zobrazené hodnoty, aby se
-- vizuál po nasazení nezměnil, dokud je admin neupraví.

alter table public.pages
  add column if not exists subtitle text;

-- Seed titulků a podtitulků pro veřejné stránky (idempotentní).
update public.pages set title = 'POPIS',        subtitle = 'O webu, jeho cílech a poslání'            where slug = 'popis';
update public.pages set title = 'VYSVĚTLIVKY',   subtitle = 'Jak číst sloupce a značky v sekci Události' where slug = 'vysvetlivky';
update public.pages set title = 'VERZE',         subtitle = 'Přehled aktualizací obsahu'                where slug = 'verze';
update public.pages set title = 'KALENDÁŘ',      subtitle = 'Události seřazené podle měsíců'             where slug = 'kalendar';
