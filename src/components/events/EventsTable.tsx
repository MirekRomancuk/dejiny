import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useAllEvents, useEventTypes, useRulers } from '@/hooks/useEvents';
import { useFilterState } from '@/hooks/useFilterState';
import { useDebounce } from '@/hooks/useDebounce';
import { filterGroups, groupEventsByYear, tokenizeSearch } from '@/lib/events/pivot';
import { TYPE_LABELS_SHORT, type Ruler, type TypeCode } from '@/types/domain';
import { Loading } from '@/components/common/Loading';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { EventsTableRow } from './EventsTableRow';

const PAGE_SIZE = 50;

export function EventsTable() {
  const { filters } = useFilterState();
  const debouncedSearch = useDebounce(filters.search, 250);
  const { data: events, isLoading } = useAllEvents();
  const { data: typeMeta } = useEventTypes();
  const { data: rulers } = useRulers();
  const [page, setPage] = useState(0);

  const visibleTypes: TypeCode[] = filters.typeCodes;
  const rulerMap = useMemo(() => {
    const m = new Map<number, Ruler>();
    (rulers ?? []).forEach((r) => m.set(r.id, r));
    return m;
  }, [rulers]);

  const groups = useMemo(() => {
    if (!events || !typeMeta) return [];
    const allGroups = groupEventsByYear(events, typeMeta.byId);
    return filterGroups(allGroups, {
      yearFrom: filters.yearFrom,
      yearTo: filters.yearTo,
      rulerId: filters.rulerId,
      searchTerms: tokenizeSearch(debouncedSearch),
    });
  }, [events, typeMeta, filters.yearFrom, filters.yearTo, filters.rulerId, debouncedSearch]);

  // Reset to page 0 whenever filters change
  useEffect(() => {
    setPage(0);
  }, [filters.yearFrom, filters.yearTo, filters.rulerId, debouncedSearch, visibleTypes.length]);

  const totalEvents = useMemo(
    () => groups.reduce((acc, g) => acc + Object.values(g.cells).reduce((a, b) => a + (b?.length ?? 0), 0), 0),
    [groups],
  );
  const totalPages = Math.max(1, Math.ceil(groups.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageStart = safePage * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + PAGE_SIZE, groups.length);
  const visibleGroups = groups.slice(pageStart, pageEnd);

  if (isLoading) return <Loading label="Načítám události…" />;
  if (groups.length === 0) {
    return (
      <EmptyState
        title="Žádné události neodpovídají filtrům"
        description="Zkuste rozšířit rozsah let nebo vymazat filtry."
      />
    );
  }

  return (
    <>
      <div className="mb-2 font-body text-sm text-muted-foreground">
        {groups.length} {pluralize(groups.length, 'rok', 'roky', 'roků')} ·{' '}
        {totalEvents} {pluralize(totalEvents, 'událost', 'události', 'událostí')}
      </div>

      <div className="rounded-lg border border-border bg-card/60 shadow-sm backdrop-blur-sm">
        <table
          className="w-full"
          style={{
            minWidth: 240 + visibleTypes.length * 150,
            borderCollapse: 'separate',
            borderSpacing: 0,
          }}
        >
          <thead>
            <tr>
              <th className="sticky top-0 z-20 w-16 whitespace-nowrap border-b border-r border-border bg-card px-3 py-3 text-left font-heading text-xs font-bold uppercase tracking-wider text-primary shadow-[0_1px_0_0_hsl(var(--border))]">
                Rok
              </th>
              <th className="sticky top-0 z-20 w-32 border-b border-r border-border bg-card px-3 py-3 text-left font-heading text-xs font-bold uppercase tracking-wider text-primary shadow-[0_1px_0_0_hsl(var(--border))]">
                Panovník
              </th>
              {visibleTypes.map((code) => (
                <th
                  key={code}
                  className="sticky top-0 z-20 border-b border-r border-border bg-card px-3 py-3 text-left font-heading text-xs font-bold uppercase tracking-wider text-primary last:border-r-0 shadow-[0_1px_0_0_hsl(var(--border))]"
                >
                  {TYPE_LABELS_SHORT[code]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleGroups.map((group) => (
              <EventsTableRow
                key={group.key}
                group={group}
                visibleTypes={visibleTypes}
                rulerMap={rulerMap}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="font-body text-sm text-muted-foreground">
            Zobrazeno {pageStart + 1}–{pageEnd} z {groups.length} {pluralize(groups.length, 'roku', 'roků', 'roků')}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(0)}
              disabled={safePage === 0}
              aria-label="První strana"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              aria-label="Předchozí strana"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1">
              {pageButtons(safePage, totalPages).map((p, i) =>
                p === '…' ? (
                  <span key={`gap-${i}`} className="px-2 text-muted-foreground">
                    …
                  </span>
                ) : (
                  <Button
                    key={p}
                    variant={p === safePage ? 'default' : 'outline'}
                    size="sm"
                    className="min-w-[2.25rem]"
                    onClick={() => setPage(p)}
                  >
                    {p + 1}
                  </Button>
                ),
              )}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
              aria-label="Další strana"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(totalPages - 1)}
              disabled={safePage >= totalPages - 1}
              aria-label="Poslední strana"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Generate compact page button list: [0,1,2,…,n-2,n-1] for many pages,
 * with `'…'` placeholder for gaps. Always shows current ± 1.
 */
function pageButtons(current: number, total: number): Array<number | '…'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const result: Array<number | '…'> = [];
  const pages = new Set<number>([0, total - 1, current - 1, current, current + 1].filter((p) => p >= 0 && p < total));
  const sorted = [...pages].sort((a, b) => a - b);
  let prev = -1;
  for (const p of sorted) {
    if (prev !== -1 && p > prev + 1) result.push('…');
    result.push(p);
    prev = p;
  }
  return result;
}

function pluralize(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return few;
  return many;
}
