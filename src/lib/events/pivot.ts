import type { Event, RowGroup, TypeCode } from '@/types/domain';
import { TYPE_CODES } from '@/types/domain';

/**
 * Convert a flat list of events into Excel-like row groups.
 *
 * Grouping rules:
 *   - Events with the same year_numeric are merged into one visual row
 *   - Each event lands in the column matching its type code (foreign / domestic / arts / …)
 *   - Multiple events in the same year+type stack in one cell (preserving `ordering`)
 *   - Events with year_numeric = null get their own per-row group (preserving Joomla source order)
 *   - A group keeps every distinct non-null ruler_id assigned to an event in that year
 *
 * Input must already be sorted: (year_numeric NULLS LAST, source_joomla_id ASC, ordering ASC).
 */
export function groupEventsByYear(
  events: Event[],
  typeCodeById: Map<number, TypeCode>,
): RowGroup[] {
  if (events.length === 0) return [];
  const groups: RowGroup[] = [];
  let current: RowGroup | null = null;

  for (const ev of events) {
    const yearKey = ev.year_numeric;
    const startNewGroup =
      current === null ||
      current.year_numeric !== yearKey ||
      yearKey === null; // each null-year event = its own row

    if (startNewGroup) {
      current = {
        key: `${yearKey ?? `nul-${ev.id}`}-${groups.length}`,
        year_numeric: yearKey,
        year_text: ev.year_text,
        ruler_ids: [],
        cells: {},
      };
      groups.push(current);
    }

    if (ev.ruler_id !== null && !current!.ruler_ids.includes(ev.ruler_id)) {
      current!.ruler_ids.push(ev.ruler_id);
    }

    const code = typeCodeById.get(ev.type_id);
    if (!code) continue;
    const bucket = current!.cells[code] ?? [];
    bucket.push(ev);
    current!.cells[code] = bucket;
  }

  // Ensure cells are sorted by `ordering` within each group
  for (const g of groups) {
    for (const code of TYPE_CODES) {
      const arr = g.cells[code];
      if (arr && arr.length > 1) {
        arr.sort((a, b) => a.ordering - b.ordering || a.id - b.id);
      }
    }
  }

  return groups;
}

/**
 * Apply filter state to a list of row groups.
 * Returns row groups whose at least one cell has a matching event.
 */
export interface PivotFilters {
  yearFrom: number | null;
  yearTo: number | null;
  rulerId: number | null;
  searchTerms: string[];
}

export function filterGroups(groups: RowGroup[], filters: PivotFilters): RowGroup[] {
  const { yearFrom, yearTo, rulerId, searchTerms } = filters;

  return groups.filter((g) => {
    // Year range filter
    if (g.year_numeric !== null) {
      if (yearFrom !== null && g.year_numeric < yearFrom) return false;
      if (yearTo !== null && g.year_numeric > yearTo) return false;
    } else if (yearFrom !== null || yearTo !== null) {
      // null-year groups: keep them only if no year-range filter is active
      return false;
    }

    // Panovníka filtrujeme podle skutečných přiřazení v daném roce. Historické
    // year_from/year_to jsou importované orientační hodnoty a nejsou spolehlivým
    // zdrojem pro filtrování událostí.
    if (rulerId !== null && !g.ruler_ids.includes(rulerId)) return false;

    // Search: at least one event in any cell must match all search terms (AND)
    if (searchTerms.length > 0) {
      const haystack = stripHtmlForSearch(
        Object.values(g.cells)
          .flat()
          .map((e) => `${e?.content_html ?? ''} ${e?.osobnost ?? ''} ${e?.poznamka ?? ''} ${e?.calendar_text ?? ''}`)
          .join(' '),
      );
      for (const term of searchTerms) {
        if (!haystack.includes(term)) return false;
      }
    }

    return true;
  });
}

const STRIP_RE = /<[^>]+>/g;
const SPACE_RE = /\s+/g;

export function stripHtmlForSearch(html: string): string {
  return html
    .replace(STRIP_RE, ' ')
    .replace(SPACE_RE, ' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export function tokenizeSearch(input: string): string[] {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2);
}
