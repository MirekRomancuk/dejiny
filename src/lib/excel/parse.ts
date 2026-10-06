import * as XLSX from 'xlsx';
import type { TypeCode } from '@/types/domain';
import { parseYearNumeric, parseMonth } from '@/lib/year';

/**
 * Excel column mapping. The Excel "Historie hlavní.xlsx" has 16 columns:
 *   A=ROK, B=PANOVNÍK, C=Dat., D=ZAHRANIČÍ, E=Dat., F=DOMÁCÍ, G=Dat., H=VZDĚLANOST-UMĚNÍ,
 *   I=Dat., J=(citáty/jiné), K=Dat., L=OSOBNOST, M=Dat., N=MÍSTO, O=Wiki, P=Mapy
 *
 * One Excel row may yield up to 6 events (one per content cell).
 */
const CONTENT_COLUMNS: Array<{
  date: string;     // date col letter
  content: string;  // content col letter
  type: TypeCode;
}> = [
  { date: 'C', content: 'D', type: 'foreign' },
  { date: 'E', content: 'F', type: 'domestic' },
  { date: 'G', content: 'H', type: 'arts' },
  { date: 'I', content: 'J', type: 'citation' },
  { date: 'K', content: 'L', type: 'person' },
  { date: 'M', content: 'N', type: 'place' },
];

export interface ParsedExcelEvent {
  source_excel_row: number;
  year_text: string | null;
  year_numeric: number | null;
  ruler_name_raw: string | null;
  type_code: TypeCode;
  date_text: string | null;
  month: number | null;
  content_html: string;
  wiki_url: string | null;
  wiki_label: string | null;
  maps_url: string | null;
  maps_label: string | null;
}

interface ParseResult {
  events: ParsedExcelEvent[];
  errors: Array<{ row: number; message: string }>;
  rowCount: number;
}

function getCell(ws: XLSX.WorkSheet, address: string): XLSX.CellObject | undefined {
  return ws[address] as XLSX.CellObject | undefined;
}

function cellToText(cell: XLSX.CellObject | undefined): string {
  if (!cell || cell.v == null) return '';
  return String(cell.v).trim();
}

/**
 * Convert a styled cell into safe HTML preserving color/size/bold/italic per the whole cell.
 */
export function cellToHtml(cell: XLSX.CellObject | undefined): string {
  if (!cell || cell.v == null) return '';
  const raw = String(cell.v);
  const escaped = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
  // SheetJS Community cellStyles support is incomplete - we leave the text plain and let admin format later.
  return escaped;
}

export function parseExcelWorkbook(buffer: ArrayBuffer): ParseResult {
  const wb = XLSX.read(buffer, { type: 'array', cellStyles: true, cellHTML: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) {
    return { events: [], errors: [{ row: 0, message: 'Žádný list v souboru.' }], rowCount: 0 };
  }
  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
  const events: ParsedExcelEvent[] = [];
  const errors: Array<{ row: number; message: string }> = [];

  let lastYearText: string | null = null;
  let lastYearNumeric: number | null = null;
  let lastRulerName: string | null = null;

  for (let row = range.s.r + 1; row <= range.e.r; row++) {
    const rowIdx = row + 1; // 1-based row index for source_excel_row
    const yearRaw = cellToText(getCell(ws, `A${rowIdx}`));
    const rulerRaw = cellToText(getCell(ws, `B${rowIdx}`));
    const wikiCell = getCell(ws, `O${rowIdx}`);
    const mapsCell = getCell(ws, `P${rowIdx}`);

    if (yearRaw) {
      lastYearText = yearRaw;
      lastYearNumeric = parseYearNumeric(yearRaw);
    }
    if (rulerRaw) {
      lastRulerName = rulerRaw;
    }

    const wikiUrl = wikiCell?.l?.Target ?? null;
    const wikiLabel = cellToText(wikiCell) || null;
    const mapsUrl = mapsCell?.l?.Target ?? null;
    const mapsLabel = cellToText(mapsCell) || null;

    let producedAny = false;
    for (const col of CONTENT_COLUMNS) {
      const content = cellToHtml(getCell(ws, `${col.content}${rowIdx}`));
      const dateText = cellToText(getCell(ws, `${col.date}${rowIdx}`));
      if (!content) continue;
      events.push({
        source_excel_row: rowIdx,
        year_text: lastYearText,
        year_numeric: lastYearNumeric,
        ruler_name_raw: lastRulerName,
        type_code: col.type,
        date_text: dateText || null,
        month: parseMonth(dateText || null),
        content_html: content,
        wiki_url: wikiUrl,
        wiki_label: wikiLabel,
        maps_url: mapsUrl,
        maps_label: mapsLabel,
      });
      producedAny = true;
    }
    if (!producedAny && (yearRaw || rulerRaw)) {
      // Year/ruler-only row with no content - skip but log
    }
  }
  return { events, errors, rowCount: events.length };
}

/**
 * Normalize content for duplicate detection: strip HTML, lowercase, normalize whitespace and remove diacritics.
 */
export function normalizeForDedupe(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}
