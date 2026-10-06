import type { RowGroup, TypeCode } from '@/types/domain';

/**
 * Kurátorské éry (kapitoly kroniky) odvozené podle roku události.
 *
 * Proč podle let a ne podle panovníka: sloupec `rulers.dynasty` je v datech prázdný
 * a roky vlády jsou místy nekonzistentní. Dělení podle pevných letopočtů je robustní
 * a dává čitelný narativ. Jméno panovníka se u uzlu zobrazí zvlášť, když je dostupné.
 *
 * `from` je inkluzivní, `to` exkluzivní. Hraniční rok patří do novější éry
 * (např. 1306 → Lucemburkové, 1526 → Habsburkové).
 */
export interface Era {
  id: string;
  name: string;
  rangeLabel: string;
  from: number;
  to: number;
}

export const ERAS: Era[] = [
  { id: 'pravek',       name: 'Pravěk a starověk',        rangeLabel: 'do 5. století', from: -1_000_000, to: 500 },
  { id: 'morava',       name: 'Sámo a Velká Morava',       rangeLabel: '500 – 895',     from: 500,  to: 895 },
  { id: 'premyslovci',  name: 'Přemyslovci',               rangeLabel: '895 – 1306',    from: 895,  to: 1306 },
  { id: 'lucemburkove', name: 'Lucemburkové',              rangeLabel: '1306 – 1437',   from: 1306, to: 1437 },
  { id: 'jagellonci',   name: 'Poděbradové a Jagellonci', rangeLabel: '1437 – 1526',   from: 1437, to: 1526 },
  { id: 'habsburkove',  name: 'Habsburská monarchie',      rangeLabel: '1526 – 1804',   from: 1526, to: 1804 },
  { id: 'cisarstvi',    name: 'Rakouské císařství',       rangeLabel: '1804 – 1918',   from: 1804, to: 1918 },
  { id: 'republika',    name: 'Republika',                 rangeLabel: 'od 1918',       from: 1918, to: 1_000_000 },
];

export function eraOfYear(year: number): Era | null {
  for (const e of ERAS) {
    if (year >= e.from && year < e.to) return e;
  }
  return null;
}

/** Pořadí kategorií pro řazení štítků a skupin uvnitř roku. */
export const TIMELINE_CAT_ORDER: TypeCode[] = ['domestic', 'foreign', 'arts', 'person', 'place'];

/** Krátké názvy kategorií pro štítky na uzlu. */
export const CAT_SHORT: Record<TypeCode, string> = {
  domestic: 'Domácí',
  foreign: 'Zahraničí',
  arts: 'Umění',
  person: 'Osobnost',
  place: 'Místo',
  citation: 'Citace',
  other: 'Ostatní',
};

/** Heraldicky laděné barvy kategorií (fungují na pergamenu i v tmavém režimu). */
export const CAT_COLORS: Record<TypeCode, string> = {
  domestic: '#8B0000', // vínová
  foreign: '#2C5F7C',  // azurová
  arts: '#C9802F',     // zlatá
  person: '#7A5C7E',   // královská fialová
  place: '#4A7C59',    // heraldická zeleň
  citation: '#6B5D4F',
  other: '#6B5D4F',
};

export interface EraBucket {
  era: Era;
  groups: RowGroup[];
}

/**
 * Má skupina (rok) aspoň jednu událost ve viditelné kategorii?
 * Bez ohledu na obsah — i událost bez textu/data se na ose zobrazí (uzel se přizpůsobí).
 */
export function hasVisibleEvents(g: RowGroup): boolean {
  return TIMELINE_CAT_ORDER.some((c) => (g.cells[c]?.length ?? 0) > 0);
}

/**
 * Rozdělí seřazené row-groups do ér. Roky bez letopočtu (null) i skupiny bez
 * viditelných událostí se do osy nezařazují (zůstávají v tabulce).
 */
export function bucketGroupsByEra(groups: RowGroup[]): EraBucket[] {
  const map = new Map<string, RowGroup[]>();
  for (const g of groups) {
    if (g.year_numeric === null || !hasVisibleEvents(g)) continue;
    const era = eraOfYear(g.year_numeric);
    if (!era) continue;
    const arr = map.get(era.id);
    if (arr) arr.push(g);
    else map.set(era.id, [g]);
  }
  return ERAS.map((era) => ({ era, groups: map.get(era.id) ?? [] })).filter((b) => b.groups.length > 0);
}

/** Zobrazovací tvar záporného/velkého roku. */
export function fmtYear(y: number): string {
  if (y < 0) {
    const v = Math.abs(y);
    return `${v >= 1000 ? `${Math.round(v / 1000)} tis.` : v} př. n. l.`;
  }
  return String(y);
}

const TAG_RE = /<[^>]*>/g;
const WS_RE = /\s+/g;
const ENTITIES: Record<string, string> = {
  '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>',
  '&quot;': '"', '&#39;': "'", '&hellip;': '…', '&ndash;': '–', '&mdash;': '—',
};

/** Čitelný textový výtah z rich-text HTML (zachovává diakritiku i velikost písmen). */
export function plainSnippet(html: string, max = 170): string {
  let t = (html || '').replace(TAG_RE, ' ');
  t = t.replace(/&[a-z#0-9]+;/gi, (m) => ENTITIES[m] ?? ' ');
  t = t.replace(WS_RE, ' ').trim();
  if (t.length > max) {
    t = t.slice(0, max).replace(/\s+\S*$/, '').trim();
    t += '…';
  }
  return t;
}

export function pluralYears(n: number): string {
  if (n === 1) return 'rok';
  if (n >= 2 && n <= 4) return 'roky';
  return 'roků';
}

export function pluralEvents(n: number): string {
  if (n === 1) return 'událost';
  if (n >= 2 && n <= 4) return 'události';
  return 'událostí';
}

export function pluralZapisy(n: number): string {
  return n >= 2 && n <= 4 ? 'zápisy' : 'zápisů';
}
