import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Edit2, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loading } from '@/components/common/Loading';
import { EmptyState } from '@/components/common/EmptyState';
import { useDebounce } from '@/hooks/useDebounce';
import { useEventTypes } from '@/hooks/useEvents';
import { TYPE_LABELS_SHORT, type TypeCode } from '@/types/domain';
import { formatYearLabel } from '@/lib/year';
import { stripHtmlForSearch, tokenizeSearch } from '@/lib/events/pivot';

const PAGE_SIZE = 50;

interface Row {
  id: number;
  year_text: string | null;
  year_numeric: number | null;
  type_id: number;
  date_text: string | null;
  content_html: string;
  ruler_id: number | null;
  osobnost: string | null;
  calendar_text: string | null;
}

export function EventsListPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const debouncedSearch = useDebounce(search, 250);
  const { data: typeMeta } = useEventTypes();

  // Load ALL events once (~2240 rows). Filter + paginate client-side so search works
  // with substring matching (handles Czech inflections like "Římští" vs "Římský").
  const { data: allRows, isLoading } = useQuery<Row[]>({
    queryKey: ['admin', 'events', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id, year_text, year_numeric, type_id, date_text, content_html, ruler_id, osobnost, calendar_text')
        .order('year_numeric', { ascending: true, nullsFirst: false })
        .order('id', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
    staleTime: 60_000,
  });

  // Pre-compute normalized search haystack per row (memoized so re-typing is instant)
  const rowsWithHaystack = useMemo(() => {
    return (allRows ?? []).map((r) => ({
      row: r,
      haystack: stripHtmlForSearch(
        `${r.content_html} ${r.osobnost ?? ''} ${r.calendar_text ?? ''} ${r.year_text ?? ''} ${r.date_text ?? ''}`,
      ),
    }));
  }, [allRows]);

  const filtered = useMemo(() => {
    const terms = tokenizeSearch(debouncedSearch);
    if (terms.length === 0) return rowsWithHaystack.map((x) => x.row);
    return rowsWithHaystack
      .filter(({ haystack }) => terms.every((t) => haystack.includes(t)))
      .map((x) => x.row);
  }, [rowsWithHaystack, debouncedSearch]);

  // Reset to page 0 when search changes
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const visibleRows = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl">Události</h1>
          <p className="text-sm text-muted-foreground">
            {allRows
              ? debouncedSearch
                ? `${filtered.length.toLocaleString('cs-CZ')} z ${allRows.length.toLocaleString('cs-CZ')} záznamů`
                : `${allRows.length.toLocaleString('cs-CZ')} záznamů`
              : '…'}
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/events/new">
            <Plus className="mr-2 h-4 w-4" />
            Nová událost
          </Link>
        </Button>
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Hledat v textu, panovníkovi, datu…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={debouncedSearch ? 'Žádné události neodpovídají hledání' : 'Žádné události'}
          description={debouncedSearch ? 'Zkuste obecnější výraz.' : 'Začněte vytvořením nové.'}
        />
      ) : (
        <div className="rounded-md border border-border bg-card">
          <div className="grid grid-cols-[80px_120px_140px_1fr_80px] gap-2 border-b border-border bg-secondary/30 px-3 py-2 font-heading text-xs uppercase tracking-wide text-muted-foreground">
            <div>Rok</div>
            <div>Datum</div>
            <div>Typ</div>
            <div>Náhled</div>
            <div className="text-right">Akce</div>
          </div>
          {visibleRows.map((r) => {
            const code = typeMeta?.byId.get(r.type_id) as TypeCode | undefined;
            const preview = stripHtmlForSearch(r.content_html).slice(0, 200);
            return (
              <div
                key={r.id}
                className="grid grid-cols-[80px_120px_140px_1fr_80px] items-center gap-2 border-b border-border/40 px-3 py-2 text-sm hover:bg-accent/30"
              >
                <div className="font-heading text-primary">{formatYearLabel(r.year_text)}</div>
                <div className="text-muted-foreground">{r.date_text ?? ''}</div>
                <div>
                  {code && <Badge variant="secondary">{TYPE_LABELS_SHORT[code]}</Badge>}
                </div>
                <div className="line-clamp-2 text-muted-foreground">{preview}</div>
                <div className="text-right">
                  <Button asChild size="icon" variant="ghost">
                    <Link to={`/admin/events/${r.id}`} aria-label="Upravit">
                      <Edit2 className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" disabled={safePage === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            Předchozí
          </Button>
          <span className="text-sm text-muted-foreground">
            Strana {safePage + 1} z {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={safePage >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
            Další
          </Button>
        </div>
      )}
    </div>
  );
}
