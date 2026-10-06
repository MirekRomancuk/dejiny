/**
 * Helpers to extract structured data from the migrated Joomla HTML.
 * Each parser is tolerant: returns `null` when the expected structure is missing
 * so callers can fall back to plain HTML rendering.
 */

export interface ChangelogEntry {
  date: string;        // "29.02.2024" (raw text from HTML)
  isoDate: string | null; // "2024-02-29" or null if can't parse
  year: number | null;
  description: string; // plain text after the dash
}

/**
 * Parse the Verze (changelog) HTML — expects paragraphs in the form
 * "DD.MM.YYYY - description" (possibly with HTML decoration).
 */
export function parseChangelog(html: string): ChangelogEntry[] | null {
  if (!html) return null;
  // Strip all tags but keep paragraph breaks as newlines
  const text = html
    .replace(/<\/p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const entries: ChangelogEntry[] = [];
  const re = /^(\d{1,2})\.(\d{1,2})\.(\d{4})\s*[-–—]\s*(.+)$/;
  for (const line of lines) {
    const m = line.match(re);
    if (!m) continue;
    const [, d, mo, y, rest] = m;
    const day = parseInt(d, 10);
    const month = parseInt(mo, 10);
    const year = parseInt(y, 10);
    entries.push({
      date: `${day.toString().padStart(2, '0')}.${month.toString().padStart(2, '0')}.${year}`,
      isoDate: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
      year,
      description: rest.trim(),
    });
  }
  if (entries.length < 3) return null;
  // Sort descending (newest first) for changelog UX
  entries.sort((a, b) => (b.isoDate ?? '').localeCompare(a.isoDate ?? ''));
  return entries;
}

export interface LegendColumn {
  term: string;            // e.g. "ROK", "PANOVNÍK"
  descriptionHtml: string;
}
export interface LegendIconRow {
  imageUrls: string[];     // One or more icon image URLs, in source order
  descriptionHtml: string; // Plain explanation
}
export interface LegendTextColor {
  /** Rendered HTML of the label cell (preserves the original colour from Joomla) */
  labelHtml: string;
  descriptionHtml: string;
}
export interface LegendDateFormat {
  format: string;          // e.g. "12.3.", "okolo t.r."
  description: string;     // plain text explanation
}

export interface ParsedLegend {
  columns: LegendColumn[];
  panovnikIcons: LegendIconRow[];
  textColors: LegendTextColor[];
  dateFormats: LegendDateFormat[];
  externalLinks: LegendIconRow[];
}

interface RawLegendRow {
  termHtml: string;
  termText: string;
  descHtml: string;
  descText: string;
  hasImgInTerm: boolean;
}

function htmlToText(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractImgUrls(html: string): string[] {
  return [...html.matchAll(/<img[^>]+src=(?:"([^"]+)"|'([^']+)')[^>]*>/gi)]
    .map((match) => match[1] ?? match[2])
    .filter((url): url is string => Boolean(url));
}

function isUppercaseLabel(text: string): boolean {
  if (!text || text.length < 3) return false;
  const letters = text.replace(/[^A-Za-zÁ-Žá-ž]/g, '');
  if (letters.length < 3) return false;
  const upper = letters.replace(/[^A-ZÁ-Ž]/g, '');
  return upper.length / letters.length >= 0.7;
}

/**
 * Parse the Vysvětlivky HTML table into 5 structured groups so each can have its own layout.
 */
export function parseLegend(html: string): ParsedLegend | null {
  if (!html) return null;
  const trs = [...html.matchAll(/<tr[^>]*>([\s\S]+?)<\/tr>/gi)];
  if (trs.length < 4) return null;

  // First normalize all rows
  const rows: RawLegendRow[] = [];
  for (let i = 1; i < trs.length; i++) {
    const inner = trs[i][1];
    const tds = [...inner.matchAll(/<td[^>]*>([\s\S]+?)<\/td>/gi)];
    if (tds.length < 2) continue;
    const termHtml = tds[0][1].trim();
    const descHtml = tds[1][1].trim();
    const termText = htmlToText(termHtml);
    const descText = htmlToText(descHtml);
    rows.push({
      termHtml,
      termText,
      descHtml,
      descText,
      hasImgInTerm: /<img\b/i.test(termHtml),
    });
  }

  const result: ParsedLegend = {
    columns: [],
    panovnikIcons: [],
    textColors: [],
    dateFormats: [],
    externalLinks: [],
  };

  // Categorize each row. State machine: after PANOVNÍK column, icon rows belong to panovnik;
  // after we've seen all UPPERCASE columns + "Text" rows, icon rows at the end are external links.
  let seenLastColumn = false; // true after we've seen MÍSTA / OSOBNOSTI
  let inDateFormats = false;

  for (const r of rows) {
    // Icon-only row
    if (!r.termText && r.hasImgInTerm) {
      const imageUrls = extractImgUrls(r.termHtml);
      if (inDateFormats || seenLastColumn) {
        result.externalLinks.push({ imageUrls, descriptionHtml: r.descHtml });
      } else {
        result.panovnikIcons.push({ imageUrls, descriptionHtml: r.descHtml });
      }
      continue;
    }
    // "Text" colored marker
    if (r.termText.toLowerCase() === 'text') {
      result.textColors.push({ labelHtml: r.termHtml, descriptionHtml: r.descHtml });
      // After text colors come the date formats
      inDateFormats = true;
      continue;
    }
    // Once the colored text examples have started the date section, all subsequent
    // non-icon rows are date notation examples. Roman numerals and season initials
    // are intentionally uppercase and must not be mistaken for table-column names.
    if (inDateFormats) {
      result.dateFormats.push({ format: r.termText, description: r.descText });
      continue;
    }
    // UPPERCASE term = main column
    if (isUppercaseLabel(r.termText)) {
      result.columns.push({ term: r.termText, descriptionHtml: r.descHtml });
      // MÍSTA / OSOBNOSTI are typically last; flip state if we've collected ≥5 columns
      if (result.columns.length >= 5) seenLastColumn = true;
      continue;
    }
    // Anything else is a date format example
    result.dateFormats.push({ format: r.termText, description: r.descText });
  }

  // Only return parsed result if we got something meaningful
  const total =
    result.columns.length +
    result.panovnikIcons.length +
    result.textColors.length +
    result.dateFormats.length +
    result.externalLinks.length;
  if (total < 5) return null;
  return result;
}

/**
 * Strip the most aggressive Joomla inline styles to let our CSS take over.
 * Keeps colours (admins use them deliberately) but drops font-family and pt sizes.
 */
export function cleanCmsHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/font-family\s*:[^;"]+;?/gi, '')
    .replace(/font-size\s*:\s*\d+pt;?/gi, '')
    .replace(/data-ccp-props="[^"]*"/gi, '')
    .replace(/\s{2,}/g, ' ');
}

export interface PopisSection {
  id: string;       // anchor slug
  heading: string;  // section title (UPPERCASE detected from Joomla content)
  bodyHtml: string; // concatenated paragraph HTML (with Brk.png removed)
}

export interface BookReference {
  author: string;
  title: string;
  year?: number;
  imageUrl?: string;
}

export interface MapSection {
  imageUrl: string;
  mapUrl: string;
  captionHtml: string;
}

export interface ParsedPopis {
  introHtml: string;
  sections: PopisSection[];
  mapSection?: MapSection;
  bibliography?: BookReference[];
}

const BRK_IMG_RE = /<img[^>]*\bBrk\.png[^>]*>/gi;

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function isHeadingParagraph(html: string): boolean {
  const text = stripTags(html);
  if (!text || text.length > 60) return false;
  // Majority of letters are UPPERCASE (handle Czech diacritics)
  const letters = text.replace(/[^A-Za-zÁ-Žá-ž]/g, '');
  if (letters.length < 4) return false;
  const upper = letters.replace(/[^A-ZÁ-Ž]/g, '');
  return upper.length / letters.length >= 0.7;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

/**
 * Match the bibliography list pattern: "Author - Title, Year" with optional book cover image.
 * Captures author, title, year separately.
 */
function parseBookLine(plainText: string, imageUrl: string | undefined): BookReference | null {
  // Strip trailing zero-width and whitespace
  const text = plainText.replace(/[​ ]/g, '').trim();
  if (!text) return null;
  // Try: "Author - Title, YEAR"
  const m = text.match(/^(.+?)\s*[-–—]\s*(.+?)(?:,\s*(\d{4}))?\s*$/);
  if (!m) return null;
  const [, author, title, year] = m;
  if (!author || !title) return null;
  return {
    author: author.trim(),
    title: title.trim(),
    year: year ? parseInt(year, 10) : undefined,
    imageUrl,
  };
}

function extractImgUrl(paragraphHtml: string): string | undefined {
  return extractImgUrls(paragraphHtml)[0];
}

function extractAnchorUrl(paragraphHtml: string): string | undefined {
  const match = paragraphHtml.match(/<a[^>]+href=(?:"([^"]+)"|'([^']+)')[^>]*>/i);
  const url = match?.[1] ?? match?.[2];
  return url?.replace(/&amp;/gi, '&').replace(/&#0*38;/gi, '&').replace(/&#x0*26;/gi, '&');
}

/**
 * Split the Popis page HTML into intro + named sections + map + bibliography.
 * Decorative Brk.png images are stripped from output.
 */
export function parsePopisSections(html: string): ParsedPopis | null {
  if (!html) return null;
  const stripped = html.replace(BRK_IMG_RE, '');
  const paragraphs = [...stripped.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => ({
    full: m[0],
    inner: m[1],
  }));
  if (paragraphs.length === 0) return null;

  const sections: PopisSection[] = [];
  const introParts: string[] = [];
  let current: PopisSection | null = null;

  // First pass: split by headings (collect bodyHtml per section). Bibliography + map are
  // detected in a second pass below.
  for (const p of paragraphs) {
    if (isHeadingParagraph(p.inner)) {
      const headingText = stripTags(p.inner);
      if (!headingText) continue;
      current = {
        id: slugify(headingText),
        heading: headingText,
        bodyHtml: '',
      };
      sections.push(current);
      continue;
    }
    if (current) {
      current.bodyHtml += p.full;
    } else {
      introParts.push(p.full);
    }
  }

  // Now scan the LAST section for the bibliography marker and the Map section.
  // These come after the last UPPERCASE heading in the original Joomla layout.
  let bibliography: BookReference[] | undefined;
  let mapSection: MapSection | undefined;

  if (sections.length > 0) {
    const last = sections[sections.length - 1];
    const tailParagraphs = [...last.bodyHtml.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => ({
      full: m[0],
      inner: m[1],
      plain: stripTags(m[1]),
    }));

    // Find the "Použitá literatura" marker
    const bibStart = tailParagraphs.findIndex((p) =>
      /použitá literatura/i.test(p.plain),
    );
    if (bibStart >= 0) {
      const books: BookReference[] = [];
      for (let i = bibStart + 1; i < tailParagraphs.length; i++) {
        const p = tailParagraphs[i];
        if (!p.plain) continue;
        // Skip the trailing decorative empty paragraphs / closing remarks
        const imageUrl = extractImgUrl(p.full);
        const book = parseBookLine(p.plain, imageUrl);
        if (book) books.push(book);
      }
      if (books.length >= 3) bibliography = books;
    }

    // Find the Map paragraph (contains Mapa.png)
    const mapParagraph = tailParagraphs.find((p) => /mapa\.png/i.test(p.full));
    if (mapParagraph) {
      const url = extractImgUrl(mapParagraph.full);
      if (url) {
        // The caption is usually the paragraph BEFORE the map image
        const mapIdx = tailParagraphs.indexOf(mapParagraph);
        const capParagraph = mapIdx > 0 ? tailParagraphs[mapIdx - 1] : null;
        mapSection = {
          imageUrl: url,
          mapUrl: extractAnchorUrl(mapParagraph.full) ?? '',
          captionHtml: capParagraph ? capParagraph.full : '',
        };
      }
    }

    // If we extracted bibliography/map, strip them (and everything from "Použitá literatura"
    // onwards) from the last section's bodyHtml so it doesn't appear twice.
    if (bibliography || mapSection) {
      const cutIndex = bibStart >= 0 ? bibStart : tailParagraphs.length;
      // Rebuild body up to (but not including) the bibliography marker, and also drop
      // the Map paragraph + its caption if present.
      const mapIdx = mapSection ? tailParagraphs.findIndex((p) => /mapa\.png/i.test(p.full)) : -1;
      const dropIndices = new Set<number>();
      if (mapIdx >= 0) {
        dropIndices.add(mapIdx);
        if (mapIdx > 0) dropIndices.add(mapIdx - 1);
        const possibleMapHeading = mapIdx > 1 ? tailParagraphs[mapIdx - 2] : null;
        if (possibleMapHeading && /mapa\s+s\s+místy/i.test(possibleMapHeading.plain)) {
          dropIndices.add(mapIdx - 2);
        }
      }
      const keepParts: string[] = [];
      for (let i = 0; i < cutIndex; i++) {
        if (!dropIndices.has(i)) keepParts.push(tailParagraphs[i].full);
      }
      last.bodyHtml = keepParts.join('');
    }
  }

  // Trim empty paragraphs (just whitespace) from intro and sections
  const cleanEmpty = (h: string) => h.replace(/<p[^>]*>\s*(?:&nbsp;|\s)*<\/p>/gi, '').trim();
  const introHtml = cleanEmpty(introParts.join(''));
  const validSections = sections
    .map((s) => ({ ...s, bodyHtml: cleanEmpty(s.bodyHtml) }))
    .filter((s) => s.bodyHtml.length > 0);

  if (validSections.length < 2) return null;
  return { introHtml, sections: validSections, mapSection, bibliography };
}
