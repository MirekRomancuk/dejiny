/**
 * Normalize year text from Excel/Joomla into a sortable integer.
 * Handles atypical formats: "830", "-70000", "okolo r. 1200", "-47-41 000", "-4500-4000"
 */
export function parseYearNumeric(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;

  // Direct integer (negative or positive)
  const direct = s.match(/^(-?\d+)$/);
  if (direct) return parseInt(direct[1], 10);

  // Range "from-to" patterns like "-47-41 000", "-22-19000", "-4500-4000"
  // Strategy: take the first signed number; if the range ends with "...000" and the first is small (<1000), multiply by 1000.
  const range = s.match(/^(-?\d+)\s*-\s*(\d+(?:\s*000)?)/);
  if (range) {
    let first = parseInt(range[1], 10);
    if (/000\s*$/.test(range[2]) && Math.abs(first) < 1000) {
      first = first * 1000;
    }
    return first;
  }

  // "okolo r. 1200", "kolem r. 1200", "okolo t.r."
  const inText = s.match(/-?\d+/);
  return inText ? parseInt(inText[0], 10) : null;
}

/**
 * Parse year from Joomla article titles like "510d-I", "568z-II", "1187-5-3".
 * Format observed: leading number is the year, followed by optional letter (d/z/u/o/p) and roman numeral.
 */
export function parseYearFromTitle(title: string | null | undefined): {
  yearText: string | null;
  yearNumeric: number | null;
} {
  if (!title) return { yearText: null, yearNumeric: null };
  const t = title.trim();
  // Negative year first: "-50d-I"
  const neg = t.match(/^(-\d+)/);
  if (neg) {
    return { yearText: neg[1], yearNumeric: parseInt(neg[1], 10) };
  }
  // Positive
  const pos = t.match(/^(\d+)/);
  if (pos) {
    return { yearText: pos[1], yearNumeric: parseInt(pos[1], 10) };
  }
  return { yearText: null, yearNumeric: null };
}

/**
 * Parse month from a Czech date-ish string. "11.5." → 5, "V." → 5, "květen" → 5, "12.4.1618" → 4.
 */
const ROMAN_MONTHS: Record<string, number> = {
  I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12,
};
const CZ_MONTHS: Record<string, number> = {
  leden: 1, ledna: 1, lednu: 1,
  únor: 2, února: 2, únoru: 2, unor: 2, unora: 2,
  březen: 3, března: 3, breznu: 3, brezna: 3,
  duben: 4, dubna: 4, dubnu: 4,
  květen: 5, května: 5, kvetnu: 5, kvetna: 5,
  červen: 6, června: 6, cervnu: 6, cervna: 6,
  červenec: 7, července: 7, cervenci: 7, cervence: 7,
  srpen: 8, srpna: 8, srpnu: 8,
  září: 9, zari: 9,
  říjen: 10, října: 10, rijen: 10, rijna: 10,
  listopad: 11, listopadu: 11, listopadem: 11,
  prosinec: 12, prosince: 12, prosinci: 12,
};

export function parseMonth(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;

  // "DD.MM." or "DD.MM.YYYY"
  const numeric = s.match(/^\d{1,2}\.\s*(\d{1,2})\.?/);
  if (numeric) {
    const m = parseInt(numeric[1], 10);
    if (m >= 1 && m <= 12) return m;
  }

  // Roman: "V.", "XII."
  const roman = s.match(/^([IVX]+)\.?$/i);
  if (roman) {
    const m = ROMAN_MONTHS[roman[1].toUpperCase()];
    if (m) return m;
  }

  // Czech word
  const word = s.toLowerCase().match(/[a-zá-ž]+/);
  if (word) {
    const m = CZ_MONTHS[word[0]];
    if (m) return m;
  }

  return null;
}

/**
 * Pretty-print a year for the public table: positive years as is, negatives with " př. n. l." suffix.
 */
export function formatYearLabel(yearText: string | null): string {
  if (!yearText) return '';
  const s = yearText.trim();
  if (s.startsWith('-')) {
    return `${s.replace(/^-/, '')} př. n. l.`;
  }
  return s;
}
