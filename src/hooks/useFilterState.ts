import { useSearchParams } from 'react-router-dom';
import { useCallback, useMemo } from 'react';
import type { TypeCode } from '@/types/domain';
import { TYPE_CODES, DEFAULT_VISIBLE_TYPES } from '@/types/domain';

export type EventsView = 'table' | 'timeline';

export interface UrlFilterState {
  yearFrom: number | null;
  yearTo: number | null;
  rulerId: number | null;
  typeCodes: TypeCode[];
  search: string;
  view: EventsView;
}

function parseTypeCodes(raw: string | null): TypeCode[] {
  if (!raw) return DEFAULT_VISIBLE_TYPES;
  const parts = raw.split(',').filter((p) => TYPE_CODES.includes(p as TypeCode)) as TypeCode[];
  return parts.length === 0 ? DEFAULT_VISIBLE_TYPES : parts;
}

export function useFilterState(): {
  filters: UrlFilterState;
  setFilter: <K extends keyof UrlFilterState>(key: K, value: UrlFilterState[K]) => void;
  reset: () => void;
} {
  const [params, setParams] = useSearchParams();

  const filters = useMemo<UrlFilterState>(() => ({
    yearFrom: params.get('from') ? parseInt(params.get('from')!, 10) : null,
    yearTo: params.get('to') ? parseInt(params.get('to')!, 10) : null,
    rulerId: params.get('ruler') ? parseInt(params.get('ruler')!, 10) : null,
    typeCodes: parseTypeCodes(params.get('cols')),
    search: params.get('q') ?? '',
    view: params.get('view') === 'timeline' ? 'timeline' : 'table',
  }), [params]);

  const setFilter = useCallback(<K extends keyof UrlFilterState>(key: K, value: UrlFilterState[K]) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      const writeOrDelete = (name: string, val: string | null) => {
        if (val === null || val === '') next.delete(name);
        else next.set(name, val);
      };
      switch (key) {
        case 'yearFrom': writeOrDelete('from', value === null ? null : String(value)); break;
        case 'yearTo':   writeOrDelete('to',   value === null ? null : String(value)); break;
        case 'rulerId':  writeOrDelete('ruler', value === null ? null : String(value)); break;
        case 'search':   writeOrDelete('q', (value as string) || null); break;
        case 'view':     writeOrDelete('view', value === 'timeline' ? 'timeline' : null); break;
        case 'typeCodes': {
          const arr = value as TypeCode[];
          const isDefault =
            arr.length === DEFAULT_VISIBLE_TYPES.length &&
            arr.every((c) => DEFAULT_VISIBLE_TYPES.includes(c));
          if (arr.length === 0 || isDefault) {
            next.delete('cols');
          } else {
            next.set('cols', arr.join(','));
          }
          break;
        }
      }
      return next;
    }, { replace: true });
  }, [setParams]);

  const reset = useCallback(() => {
    setParams(new URLSearchParams(), { replace: true });
  }, [setParams]);

  return { filters, setFilter, reset };
}
