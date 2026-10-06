import assert from 'node:assert/strict';
import test from 'node:test';
import type { Event, TypeCode } from '../types/domain';
import { filterGroups, groupEventsByYear } from './events/pivot';

const typeMap = new Map<number, TypeCode>([[1, 'domestic']]);

function event(overrides: Partial<Event>): Event {
  return {
    id: 1,
    type_id: 1,
    ruler_id: null,
    year_numeric: 935,
    year_text: '935',
    date_text: null,
    month: null,
    content_html: 'Událost',
    wiki_url: null,
    wiki_label: null,
    maps_url: null,
    maps_label: null,
    toulky_url: null,
    highlight: null,
    osobnost: null,
    poznamka: null,
    image_refs: [],
    show_in_calendar: false,
    calendar_text: null,
    ordering: 0,
    source_joomla_id: null,
    source_excel_row: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

test('seskupení roku zachová všechny skutečně přiřazené panovníky bez duplicit', () => {
  const groups = groupEventsByYear(
    [
      event({ id: 1, year_numeric: 935, year_text: '935', ruler_id: 33 }),
      event({ id: 2, year_numeric: 935, year_text: '935', ruler_id: 2 }),
      event({ id: 3, year_numeric: 935, year_text: '935', ruler_id: 2 }),
      event({ id: 4, year_numeric: 936, year_text: '936', ruler_id: 2 }),
      event({ id: 5, year_numeric: 937, year_text: '937', ruler_id: null }),
    ],
    typeMap,
  );

  assert.deepEqual(
    groups.map((group) => ({ year: group.year_numeric, rulers: group.ruler_ids })),
    [
      { year: 935, rulers: [33, 2] },
      { year: 936, rulers: [2] },
      { year: 937, rulers: [] },
    ],
  );
});

test('filtr panovníka vybírá jen roky, ve kterých je skutečně přiřazen', () => {
  const groups = groupEventsByYear(
    [
      event({ id: 1, year_numeric: 934, year_text: '934', ruler_id: 33 }),
      event({ id: 2, year_numeric: 935, year_text: '935', ruler_id: 33 }),
      event({ id: 3, year_numeric: 935, year_text: '935', ruler_id: 2 }),
      event({ id: 4, year_numeric: 936, year_text: '936', ruler_id: 2 }),
    ],
    typeMap,
  );

  assert.deepEqual(
    filterGroups(groups, {
      yearFrom: null,
      yearTo: null,
      rulerId: 2,
      searchTerms: [],
    }).map((group) => group.year_numeric),
    [935, 936],
  );
});
