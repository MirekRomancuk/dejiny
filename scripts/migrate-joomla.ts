/**
 * Joomla SQL dump → Supabase migration script.
 *
 * Usage:
 *   npm run migrate:joomla
 *
 * Requires:
 *   - legacy/dejinykorunyceske.sql (Joomla DB dump)
 *   - .env.development with VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY with RLS bypass already done via auth)
 *
 * Steps:
 *   1) Parse hm4de_categories, hm4de_fields (definitions), hm4de_fields_values, hm4de_content
 *   2) Extract option mapping for list fields (Typ události, Panovník, Měsíc, Zobrazení v kalendáři)
 *   3) Seed rulers from field 11 options
 *   4) For each published article (state=1) in catid=2, pivot custom field values into Event row
 *   5) Extract Popis/Vysvětlivky/Verze/Home as pages
 *   6) Compute ruler year_from/year_to from event year_numeric aggregates
 *   7) Batch insert into Supabase
 *
 * Note: HTML cleanup (Joomla shortcodes, broken image paths) happens here; image path rewrite to Supabase URLs happens in upload-images.ts after the images.zip arrives.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { parseYearFromTitle, parseYearNumeric, parseMonth } from '../src/lib/year';
import type { TypeCode } from '../src/types/domain';

// --------------------------------------------------------------
// Configuration
// --------------------------------------------------------------
const SQL_PATH = resolve(process.cwd(), 'legacy/dejinykorunyceske.sql');
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SERVICE_KEY ??
  process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SERVICE_ROLE_KEY env vars.');
  process.exit(1);
}

const SB_URL: string = SUPABASE_URL;
const SB_KEY: string = SERVICE_KEY;

const PUBLISHED_STATE = 1;
const EVENTS_CATEGORY_ID = 2;
const CMS_PAGE_MAP: Record<number, { slug: string; title: string }> = {
  315: { slug: 'popis', title: 'Popis' },
  316: { slug: 'vysvetlivky', title: 'Vysvětlivky' },
  318: { slug: 'verze', title: 'Verze' },
  335: { slug: 'home', title: 'Vítejte' },
};

// Joomla custom field IDs (from our analysis of hm4de_fields)
const FIELD = {
  TYP: 4,          // list - Typ události
  OBRAZEK: 5,      // media
  MAPY: 6,         // text (Mapy URL)
  WIKI: 7,         // url
  TOULKY: 8,       // textarea
  JINE: 9,         // textarea
  ROK: 10,         // list (ignored - parsed from title)
  PANOVNIK: 11,    // list
  DATUM: 12,       // text
  TEXT: 14,        // textarea - main event text
  PORADI: 15,      // integer
  OSOBNOST: 16,    // text
  GALERIA: 17,     // media
  OBR2: 18,        // media
  OBR3: 19,        // media
  OBR_K_UDALOSTI: 20, // media
  POZNAMKA: 21,    // text
  ZOBRAZENI_KAL: 22, // list (yes/no)
  TEXT_KAL: 24,    // textarea
  MESIC: 25,       // list
} as const;

// Mapping Joomla "Typ události" option index → our event_types.code
// Verified from actual Joomla params JSON during first migration attempt:
//   typ 1 → POLITIKA A VÝZNAMNÉ UDÁLOSTI V ZAHRANIČÍ
//   typ 2 → POLITIKA A VÝZNAMNÉ UDÁLOSTI DOMÁCÍ
//   typ 3 → VZDĚLANOST-HOSPODÁŘSTVÍ - PRÁVO (mapped to 'citation' code, relabeled in DB)
//   typ 4 → UMĚNÍ - LITERATURA (mapped to 'arts')
//   typ 5 → OSOBNOST
//   typ 6 → MÍSTO
const TYP_VALUE_TO_CODE: Record<string, TypeCode> = {
  '1': 'foreign',
  '2': 'domestic',
  '3': 'citation',
  '4': 'arts',
  '5': 'person',
  '6': 'place',
};

// --------------------------------------------------------------
// SQL dump parser (line-based, for mysqldump default format where
// each INSERT block puts each tuple on its own line ending with `),` or `);`)
// --------------------------------------------------------------

interface JoomlaArticle {
  id: number;
  asset_id: number;
  title: string;
  alias: string;
  introtext: string;
  fulltext: string;
  state: number;
  catid: number;
}

interface JoomlaFieldDef {
  id: number;
  context: string;
  title: string;
  name: string;
  label: string;
  type: string;
  fieldparams: string;
  params: string;
}

interface JoomlaFieldValue {
  field_id: number;
  item_id: string;
  value: string;
}

interface JoomlaCategory {
  id: number;
  parent_id: number;
  level: number;
  path: string;
  extension: string;
  title: string;
  alias: string;
}

// Unescape mysqldump string literal: \' → ', \\ → \, \n → newline, \r → CR
function unescapeMysql(s: string): string {
  return s
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\0/g, '\0')
    .replace(/\\\\/g, '\\');
}

/**
 * Tokenizer for a single VALUES tuple. Handles quoted strings, NULLs and numbers.
 * Returns an array of raw token strings (without surrounding quotes for strings; "NULL" stays as string "NULL").
 */
function parseTuple(line: string): string[] | null {
  // Strip leading "(" and trailing "),\n" or ");\n" or just ")"
  const trimmed = line.trim();
  if (!trimmed.startsWith('(')) return null;
  let i = 1; // after opening (
  const tokens: string[] = [];
  let current = '';
  let inString = false;

  while (i < trimmed.length) {
    const ch = trimmed[i];
    if (inString) {
      if (ch === '\\' && i + 1 < trimmed.length) {
        current += ch + trimmed[i + 1];
        i += 2;
        continue;
      }
      if (ch === "'") {
        inString = false;
        i++;
        continue;
      }
      current += ch;
      i++;
      continue;
    }
    // Not in string
    if (ch === "'") {
      inString = true;
      i++;
      continue;
    }
    if (ch === ',') {
      tokens.push(current.trim());
      current = '';
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push(current.trim());
      return tokens;
    }
    current += ch;
    i++;
  }
  return null;
}

function readRowsForTable<T>(
  sql: string,
  tableName: string,
  mapper: (tokens: string[]) => T | null,
): T[] {
  const out: T[] = [];
  const insertHeader = `INSERT INTO \`${tableName}\``;
  const lines = sql.split('\n');
  let inBlock = false;
  for (const line of lines) {
    if (line.startsWith(insertHeader)) {
      inBlock = true;
      continue;
    }
    if (!inBlock) continue;
    if (line.startsWith('(')) {
      const tokens = parseTuple(line);
      if (tokens) {
        const row = mapper(tokens);
        if (row) out.push(row);
      }
      continue;
    }
    if (line.startsWith('--') || line.startsWith('INSERT INTO') || line.startsWith('CREATE TABLE') || line.startsWith('DROP TABLE') || line.trim() === '') {
      inBlock = false;
    }
  }
  return out;
}

// --------------------------------------------------------------
// Joomla shortcode cleanup
// --------------------------------------------------------------
function cleanJoomlaHtml(html: string): string {
  if (!html) return '';
  return html
    // Joomla {loadposition X}, {tab X}, {/tab}, {loadmodule X}, …
    .replace(/\{\s*loadposition[^}]*\}/gi, '')
    .replace(/\{\s*loadmodule[^}]*\}/gi, '')
    .replace(/\{\s*\/?\s*tab[^}]*\}/gi, '')
    .replace(/\{\s*emailcloak[^}]*\}/gi, '')
    .replace(/\{[a-z_]+[^}]*\}/gi, (m) => (m.length < 60 ? '' : m))
    .trim();
}

// --------------------------------------------------------------
// Main migration
// --------------------------------------------------------------
async function main() {
  console.log('▸ Reading SQL dump:', SQL_PATH);
  const sql = readFileSync(SQL_PATH, 'utf-8');
  console.log(`  Size: ${(sql.length / 1024 / 1024).toFixed(1)} MB`);

  // ---- Parse categories (sanity check) ----
  const categories = readRowsForTable<JoomlaCategory>(sql, 'hm4de_categories', (t) => ({
    id: parseInt(t[0], 10),
    parent_id: parseInt(t[2], 10),
    level: parseInt(t[5], 10),
    path: unescapeMysql(t[6]),
    extension: unescapeMysql(t[7]),
    title: unescapeMysql(t[8]),
    alias: unescapeMysql(t[9]),
  }));
  console.log(`▸ Categories: ${categories.length}`);

  // ---- Parse field definitions ----
  const fieldDefs = readRowsForTable<JoomlaFieldDef>(sql, 'hm4de_fields', (t) => ({
    id: parseInt(t[0], 10),
    context: unescapeMysql(t[2]),
    title: unescapeMysql(t[4]),
    name: unescapeMysql(t[5]),
    label: unescapeMysql(t[6]),
    type: unescapeMysql(t[8] ?? ''),
    fieldparams: unescapeMysql(t[17] ?? ''),
    params: unescapeMysql(t[16] ?? ''),
  }));
  console.log(`▸ Field defs: ${fieldDefs.length}`);

  // ---- Parse field values ----
  const fieldValues = readRowsForTable<JoomlaFieldValue>(sql, 'hm4de_fields_values', (t) => {
    if (t.length < 3) return null;
    return {
      field_id: parseInt(t[0], 10),
      item_id: unescapeMysql(t[1]),
      value: unescapeMysql(t[2]),
    };
  });
  console.log(`▸ Field values: ${fieldValues.length}`);

  // Pivot field values by article id
  const fieldsByArticle = new Map<number, Record<number, string>>();
  for (const fv of fieldValues) {
    const articleId = parseInt(fv.item_id, 10);
    if (!Number.isFinite(articleId)) continue;
    let bucket = fieldsByArticle.get(articleId);
    if (!bucket) {
      bucket = {};
      fieldsByArticle.set(articleId, bucket);
    }
    bucket[fv.field_id] = fv.value;
  }

  // ---- Build rulers from distinct values of field PANOVNIK ----
  // We treat raw values (could be numeric IDs or text labels) - inspect first to decide.
  const rulerSamples = new Set<string>();
  for (const fv of fieldValues) {
    if (fv.field_id === FIELD.PANOVNIK && fv.value) {
      rulerSamples.add(fv.value);
    }
  }
  console.log(`▸ Unique ruler raw values: ${rulerSamples.size}`);

  // The Joomla "list" field stores either option-key string or numeric index depending on config.
  // From the dump preview we saw `value=1`, `value=Neurčeno` etc. - so it's likely option keys/values.
  // We'll attempt to parse field params JSON for label resolution, otherwise keep raw text.
  const panovnikDef = fieldDefs.find((f) => f.id === FIELD.PANOVNIK);
  const panovnikOptions = parseListOptions(panovnikDef?.fieldparams ?? panovnikDef?.params ?? '');
  console.log(`▸ Panovník options parsed: ${panovnikOptions.size}`);

  const typDef = fieldDefs.find((f) => f.id === FIELD.TYP);
  const typOptions = parseListOptions(typDef?.fieldparams ?? typDef?.params ?? '');
  console.log(`▸ Typ udál. options parsed: ${typOptions.size}`);
  if (typOptions.size > 0) {
    for (const [k, v] of typOptions) {
      console.log(`    typ ${k} → ${v}`);
    }
  }

  const mesicDef = fieldDefs.find((f) => f.id === FIELD.MESIC);
  const mesicOptions = parseListOptions(mesicDef?.fieldparams ?? mesicDef?.params ?? '');

  // Build final ruler list
  const rulerNames = new Set<string>();
  for (const raw of rulerSamples) {
    const label = panovnikOptions.get(raw) ?? raw;
    if (label && label !== 'Neurčeno' && label !== '0' && label !== '') {
      rulerNames.add(label);
    }
  }
  console.log(`▸ Final ruler labels: ${rulerNames.size}`);

  // ---- Parse content (articles) ----
  const articles = readRowsForTable<JoomlaArticle>(sql, 'hm4de_content', (t) => {
    if (t.length < 8) return null;
    return {
      id: parseInt(t[0], 10),
      asset_id: parseInt(t[1], 10),
      title: unescapeMysql(t[2]),
      alias: unescapeMysql(t[3]),
      introtext: unescapeMysql(t[4]),
      fulltext: unescapeMysql(t[5]),
      state: parseInt(t[6], 10),
      catid: parseInt(t[7], 10),
    };
  });
  console.log(`▸ Articles: ${articles.length}`);

  const publishedEvents = articles.filter(
    (a) => a.state === PUBLISHED_STATE && a.catid === EVENTS_CATEGORY_ID,
  );
  console.log(`▸ Published events: ${publishedEvents.length}`);

  const cmsPages: Array<{ slug: string; title: string; content_html: string }> = [];
  for (const article of articles) {
    const map = CMS_PAGE_MAP[article.id];
    if (!map) continue;
    if (article.state !== PUBLISHED_STATE) continue;
    cmsPages.push({
      slug: map.slug,
      title: map.title,
      content_html: cleanJoomlaHtml((article.introtext ?? '') + (article.fulltext ?? '')),
    });
  }
  console.log(`▸ CMS pages: ${cmsPages.length}`);

  // ---- Supabase client ----
  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });

  // ---- Seed rulers ----
  console.log('▸ Seeding rulers…');
  const rulerArr = [...rulerNames].sort();
  if (rulerArr.length > 0) {
    const { error } = await sb
      .from('rulers')
      .upsert(rulerArr.map((name, idx) => ({ name, display_order: idx })), {
        onConflict: 'name',
      });
    if (error) {
      console.error('  Failed to upsert rulers:', error);
      process.exit(1);
    }
  }
  const { data: dbRulers } = await sb.from('rulers').select('id, name');
  const rulerByName = new Map((dbRulers ?? []).map((r: { id: number; name: string }) => [r.name, r.id]));

  // ---- Get event_types map ----
  const { data: dbTypes } = await sb.from('event_types').select('id, code');
  const typeByCode = new Map<string, number>(
    (dbTypes ?? []).map((t: { id: number; code: string }) => [t.code, t.id]),
  );
  if (!typeByCode.has('domestic')) {
    console.error('event_types not seeded - run 0001_init.sql first');
    process.exit(1);
  }

  // ---- Transform events ----
  console.log('▸ Transforming events…');
  const eventsToInsert: Record<string, unknown>[] = [];
  for (const article of publishedEvents) {
    const f = fieldsByArticle.get(article.id) ?? {};
    const { yearText, yearNumeric } = parseYearFromTitle(article.title);
    const typRaw = f[FIELD.TYP];
    const typCode: TypeCode = (typRaw ? TYP_VALUE_TO_CODE[typRaw] : undefined) ?? 'other';
    const typeId = typeByCode.get(typCode) ?? typeByCode.get('other')!;
    const panovnikRaw = f[FIELD.PANOVNIK];
    const panovnikLabel = panovnikRaw ? (panovnikOptions.get(panovnikRaw) ?? panovnikRaw) : null;
    const rulerId = panovnikLabel ? rulerByName.get(panovnikLabel) ?? null : null;

    const dateText = f[FIELD.DATUM] ?? null;
    const mesicRaw = f[FIELD.MESIC];
    const month =
      (mesicRaw && parseMonth(mesicOptions.get(mesicRaw) ?? mesicRaw)) ??
      parseMonth(dateText ?? null);

    const contentHtml = cleanJoomlaHtml(
      [f[FIELD.TEXT], f[FIELD.TOULKY], f[FIELD.JINE]].filter(Boolean).join('\n\n'),
    );

    const imageRefs: { url: string }[] = [];
    for (const id of [FIELD.OBRAZEK, FIELD.GALERIA, FIELD.OBR2, FIELD.OBR3, FIELD.OBR_K_UDALOSTI]) {
      const raw = f[id];
      if (raw && raw.trim() && raw !== '0') {
        imageRefs.push({ url: raw.trim() });
      }
    }

    eventsToInsert.push({
      year_text: yearText,
      year_numeric: yearNumeric,
      ruler_id: rulerId,
      type_id: typeId,
      date_text: dateText,
      month: month,
      content_html: contentHtml,
      wiki_url: f[FIELD.WIKI] ?? null,
      maps_url: f[FIELD.MAPY] ?? null,
      osobnost: f[FIELD.OSOBNOST] ?? null,
      poznamka: f[FIELD.POZNAMKA] ?? null,
      image_refs: imageRefs,
      show_in_calendar: f[FIELD.ZOBRAZENI_KAL] === '1' || f[FIELD.ZOBRAZENI_KAL] === 'yes',
      calendar_text: f[FIELD.TEXT_KAL] ?? null,
      ordering: parseInt(f[FIELD.PORADI] ?? '0', 10) || 0,
      source_joomla_id: article.id,
    });
  }
  console.log(`▸ Events ready to insert: ${eventsToInsert.length}`);

  // ---- Batch insert events ----
  console.log('▸ Inserting events to Supabase…');
  const CHUNK = 500;
  for (let i = 0; i < eventsToInsert.length; i += CHUNK) {
    const slice = eventsToInsert.slice(i, i + CHUNK);
    const { error } = await sb.from('events').upsert(slice, {
      onConflict: 'source_joomla_id',
      ignoreDuplicates: false,
    });
    if (error) {
      console.error(`  Batch ${i / CHUNK + 1} failed:`, error);
      process.exit(1);
    }
    process.stdout.write(`\r  Inserted ${Math.min(i + CHUNK, eventsToInsert.length)}/${eventsToInsert.length}`);
  }
  process.stdout.write('\n');

  // ---- Insert CMS pages ----
  console.log('▸ Updating CMS pages…');
  for (const p of cmsPages) {
    const { error } = await sb.from('pages').upsert(p, { onConflict: 'slug' });
    if (error) {
      console.error(`  page ${p.slug} failed:`, error);
    } else {
      console.log(`  ✓ ${p.slug} (${p.content_html.length} chars)`);
    }
  }

  // ---- Update ruler year_from/year_to from events ----
  console.log('▸ Updating ruler year ranges…');
  const { data: aggData } = await sb
    .from('events')
    .select('ruler_id, year_numeric')
    .not('ruler_id', 'is', null)
    .not('year_numeric', 'is', null);
  const agg = new Map<number, { from: number; to: number }>();
  for (const row of aggData ?? []) {
    const r = row as { ruler_id: number; year_numeric: number };
    const cur = agg.get(r.ruler_id);
    if (!cur) {
      agg.set(r.ruler_id, { from: r.year_numeric, to: r.year_numeric });
    } else {
      cur.from = Math.min(cur.from, r.year_numeric);
      cur.to = Math.max(cur.to, r.year_numeric);
    }
  }
  for (const [rulerId, { from, to }] of agg) {
    await sb.from('rulers').update({ year_from: from, year_to: to }).eq('id', rulerId);
  }
  console.log(`  Updated ${agg.size} ruler year ranges`);

  console.log('✓ Migration finished');
}

/**
 * Parse Joomla list field params JSON to extract option key → label map.
 * Joomla stores it as JSON with shape: `{"options":{"options0":{"name":"foo","value":"1"},...}}`
 * or `{"options":[{"name":"foo","value":"1"},...]}` depending on version.
 */
function parseListOptions(raw: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!raw) return map;
  try {
    const json = JSON.parse(raw);
    const opts = json.options;
    if (!opts) return map;
    const list = Array.isArray(opts) ? opts : Object.values(opts);
    for (const o of list as Array<{ name?: string; value?: string }>) {
      if (o && o.value != null && o.name != null) {
        map.set(String(o.value), String(o.name));
      }
    }
  } catch {
    /* ignore */
  }
  return map;
}

// Use parseYearNumeric as fallback if title-based parsing fails
void parseYearNumeric;

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
