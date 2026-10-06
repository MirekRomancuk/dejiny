/**
 * Jednorázová migrace obsahu stránek Popis / Vysvětlivky / Verze
 * z `pages.content_html` do strukturovaných řádků `page_blocks`.
 *
 * Používá stejné parsery jako web (src/lib/cmsParsers.ts). `content_html`
 * zůstává netknutý jako záloha. Skript je idempotentní — před vložením smaže
 * existující bloky daných stránek.
 *
 * Run:  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/migrate-pages-to-blocks.ts
 *       (přidej --dry-run pro výpis bez zápisu)
 */

import { createClient } from '@supabase/supabase-js';
import { parsePopisSections, parseLegend, parseChangelog } from '../src/lib/cmsParsers';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DRY_RUN = process.argv.includes('--dry-run');
const POPIS_MAP_URL =
  'https://www.google.com/maps/d/viewer?mid=1GWeRf4RDw8LxCaRIxVxeaS0Z_5HJD5c&ll=49.89364478744786%2C15.289757450000003&z=8';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Chybí SUPABASE_URL nebo SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

type BlockRow = { page_slug: string; kind: string; position: number; data: Record<string, string> };

function externalIcon(imageUrls: string[]): string {
  const h = imageUrls.join(' ').toLowerCase();
  if (h.includes('wikipedia')) return 'wikipedia';
  if (h.includes('mapy')) return 'mapy';
  if (h.includes('galerie')) return 'galerie';
  if (h.includes('rdio') || h.includes('radio')) return 'radio';
  return 'external';
}

async function fetchPage(slug: string): Promise<string | null> {
  const { data, error } = await sb.from('pages').select('content_html').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return (data as { content_html: string } | null)?.content_html ?? null;
}

function buildPopisBlocks(html: string): BlockRow[] {
  const parsed = parsePopisSections(html);
  if (!parsed) return [];
  const blocks: BlockRow[] = [];
  let pos = 0;
  if (parsed.introHtml.trim()) {
    blocks.push({ page_slug: 'popis', kind: 'popis_intro', position: pos++, data: { bodyHtml: parsed.introHtml } });
  }
  for (const s of parsed.sections) {
    blocks.push({
      page_slug: 'popis',
      kind: 'popis_section',
      position: pos++,
      data: { heading: s.heading, bodyHtml: s.bodyHtml },
    });
  }
  if (parsed.mapSection) {
    blocks.push({
      page_slug: 'popis',
      kind: 'popis_map',
      position: pos++,
      data: {
        imageUrl: parsed.mapSection.imageUrl,
        // Cílová veřejná viewer URL je schválená klientem. Joomla zdroj stále
        // obsahuje starý edit odkaz, který by opakovaná migrace neměla vrátit.
        mapUrl: POPIS_MAP_URL,
        captionHtml: parsed.mapSection.captionHtml,
      },
    });
  }
  return blocks;
}

function buildLegendBlocks(html: string): BlockRow[] {
  const parsed = parseLegend(html);
  if (!parsed) return [];
  const blocks: BlockRow[] = [];
  let pos = 0;
  for (const c of parsed.columns) {
    blocks.push({ page_slug: 'vysvetlivky', kind: 'legend_column', position: pos++, data: { term: c.term, descriptionHtml: c.descriptionHtml } });
  }
  for (const r of parsed.panovnikIcons) {
    blocks.push({
      page_slug: 'vysvetlivky',
      kind: 'legend_icon',
      position: pos++,
      data: {
        imageUrl: r.imageUrls[0] ?? '',
        imageUrl2: r.imageUrls[1] ?? '',
        descriptionHtml: r.descriptionHtml,
      },
    });
  }
  for (const t of parsed.textColors) {
    blocks.push({ page_slug: 'vysvetlivky', kind: 'legend_text_color', position: pos++, data: { labelHtml: t.labelHtml, descriptionHtml: t.descriptionHtml } });
  }
  for (const d of parsed.dateFormats) {
    blocks.push({ page_slug: 'vysvetlivky', kind: 'legend_date_format', position: pos++, data: { format: d.format, description: d.description } });
  }
  for (const e of parsed.externalLinks) {
    blocks.push({ page_slug: 'vysvetlivky', kind: 'legend_external_link', position: pos++, data: { icon: externalIcon(e.imageUrls), descriptionHtml: e.descriptionHtml } });
  }
  return blocks;
}

function buildChangelogBlocks(html: string): BlockRow[] {
  const entries = parseChangelog(html);
  if (!entries) return [];
  return entries.map((e, i) => ({
    page_slug: 'verze',
    kind: 'changelog',
    position: i,
    data: { date: e.date, description: e.description },
  }));
}

async function migrateSlug(slug: string, build: (html: string) => BlockRow[]) {
  const html = await fetchPage(slug);
  if (!html) {
    console.log(`  ${slug}: žádný content_html — přeskočeno`);
    return;
  }
  const blocks = build(html);
  console.log(`  ${slug}: naparsováno ${blocks.length} bloků`);

  if (DRY_RUN) {
    if (blocks.length === 0) {
      console.log(`    ⚠ parser nic nevrátil — content_html možná nemá očekávanou strukturu`);
    } else {
      for (const b of blocks) console.log(`    [${b.position}] ${b.kind}: ${JSON.stringify(b.data).slice(0, 90)}…`);
    }
    return;
  }

  // Idempotence: vždy smaž existující bloky téhle stránky (i když parser nic nevrátil,
  // aby na webu nezůstal zastaralý strukturovaný obsah — spadne se na content_html).
  const { error: delErr } = await sb.from('page_blocks').delete().eq('page_slug', slug);
  if (delErr) throw delErr;

  if (blocks.length === 0) {
    console.log(`    ⚠ parser nic nevrátil — staré bloky smazány, ponechán content_html`);
    return;
  }

  const { error: insErr } = await sb.from('page_blocks').insert(blocks);
  if (insErr) throw insErr;
  console.log(`    ✓ vloženo ${blocks.length} bloků`);
}

async function main() {
  console.log(`▸ Migrace stránek do page_blocks${DRY_RUN ? ' (dry-run)' : ''}`);
  await migrateSlug('popis', buildPopisBlocks);
  await migrateSlug('vysvetlivky', buildLegendBlocks);
  await migrateSlug('verze', buildChangelogBlocks);
  console.log('✓ Hotovo.');
}

main().catch((e) => {
  console.error('✗ Chyba:', e);
  process.exit(1);
});
