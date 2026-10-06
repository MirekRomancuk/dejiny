import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queryKeys';
import { Loading } from '@/components/common/Loading';
import { EmptyState } from '@/components/common/EmptyState';
import { CellViewer } from '@/components/events/CellViewer';
import { HeroHeader } from '@/components/layout/HeroHeader';
import { PageEditButton } from '@/components/admin-inline/PageEditButton';
import { EditAffordance } from '@/components/admin-inline/EditAffordance';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/useSession';
import { useRulers } from '@/hooks/useEvents';
import { useEventMutations } from '@/hooks/useEventMutations';
import { useAdminEdit } from '@/components/admin-inline/AdminEditProvider';
import { parseMonth, formatYearLabel } from '@/lib/year';
import { cn } from '@/lib/cn';
import type { Event, Ruler, Page } from '@/types/domain';

const MONTH_NAMES = [
  '',
  'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
  'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec',
];

/** Událost s vyřešeným měsícem (z DB nebo z date_text). */
type CalEvent = Event & { month: number };

export function KalendarPage() {
  const { isAdmin } = useProfile();
  const { openEditor } = useAdminEdit();
  const { deleteEvent } = useEventMutations();
  const [selectedMonth, setSelectedMonth] = useState<number>(0); // 0 = uninitialized

  const { data: rulers } = useRulers();
  const rulerMap = useMemo(() => {
    const m = new Map<number, Ruler>();
    (rulers ?? []).forEach((r) => m.set(r.id, r));
    return m;
  }, [rulers]);

  // Hlavička (titulek/podtitulek) z DB s fallbackem na výchozí texty.
  const { data: page } = useQuery<Page | null>({
    queryKey: qk.pages.one('kalendar'),
    queryFn: async () => {
      const { data, error } = await supabase.from('pages').select('*').eq('slug', 'kalendar').maybeSingle();
      if (error) throw error;
      return (data ?? null) as Page | null;
    },
  });

  const { data: events, isLoading } = useQuery<CalEvent[]>({
    queryKey: ['calendar', 'from-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('show_in_calendar', true);
      if (error) throw error;
      const raw = (data ?? []) as Event[];
      // Resolve month from date_text if missing in DB
      return raw
        .map((e) => {
          const m = e.month ?? parseMonth(e.date_text);
          return m && m >= 1 && m <= 12 ? ({ ...e, month: m } as CalEvent) : null;
        })
        .filter((e): e is CalEvent => e !== null);
    },
  });

  // Group events by month
  const byMonth = useMemo(() => {
    const map = new Map<number, CalEvent[]>();
    for (const e of events ?? []) {
      if (!map.has(e.month)) map.set(e.month, []);
      map.get(e.month)!.push(e);
    }
    // Sort each month's events by year
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.year_numeric ?? 0) - (b.year_numeric ?? 0));
    }
    return map;
  }, [events]);

  // Auto-select first month with events on initial load
  useEffect(() => {
    if (selectedMonth !== 0 || !events || events.length === 0) return;
    const sorted = [...byMonth.keys()].sort((a, b) => a - b);
    if (sorted.length > 0) setSelectedMonth(sorted[0]);
  }, [events, byMonth, selectedMonth]);

  const monthsWithEvents = useMemo(
    () => new Set([...byMonth.keys()]),
    [byMonth],
  );

  const visibleEvents = byMonth.get(selectedMonth) ?? [];
  const hasAnyEvents = (events?.length ?? 0) > 0;

  function navigateMonth(direction: -1 | 1) {
    let m = selectedMonth + direction;
    while (m >= 1 && m <= 12 && !monthsWithEvents.has(m)) m += direction;
    if (m >= 1 && m <= 12) setSelectedMonth(m);
  }

  const canPrev = [...monthsWithEvents].some((m) => m < selectedMonth);
  const canNext = [...monthsWithEvents].some((m) => m > selectedMonth);

  return (
    <>
      <HeroHeader
        pageTitle={page?.title?.trim() || 'KALENDÁŘ'}
        pageSubtitle={page?.subtitle?.trim() || 'Události seřazené podle měsíců'}
      />
      <PageEditButton slug="kalendar" label="Kalendář" hasContent={false} />
      <article className="mx-auto max-w-5xl px-4 py-8">
        {isLoading ? (
          <Loading />
        ) : !hasAnyEvents ? (
          <EmptyState
            title="Kalendář je zatím prázdný"
            description={
              isAdmin
                ? 'V administraci u událostí zaškrtni „Zobrazit v kalendáři“ a vyplň „Měsíc“.'
                : 'Žádné události zatím nejsou označeny pro zobrazení v kalendáři.'
            }
            action={
              isAdmin && (
                <Button asChild>
                  <Link to="/admin/events">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    Spravovat události
                  </Link>
                </Button>
              )
            }
          />
        ) : (
          <>
            {/* Month tabs */}
            <div className="mb-8 flex items-center gap-1 overflow-x-auto rounded-lg border border-border bg-card/60 p-2 shadow-sm backdrop-blur-sm">
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 shrink-0"
                disabled={!canPrev}
                onClick={() => navigateMonth(-1)}
                aria-label="Předchozí měsíc"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex flex-1 items-center justify-center gap-0.5">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                  const count = byMonth.get(m)?.length ?? 0;
                  const isActive = selectedMonth === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => count > 0 && setSelectedMonth(m)}
                      disabled={count === 0}
                      className={cn(
                        'shrink-0 whitespace-nowrap rounded-md px-2.5 py-1.5 font-heading text-xs font-semibold uppercase tracking-wider transition-colors md:px-3 md:text-sm',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : count === 0
                          ? 'cursor-not-allowed text-muted-foreground/40'
                          : 'text-muted-foreground hover:bg-accent/30 hover:text-foreground',
                      )}
                    >
                      {MONTH_NAMES[m]}
                      {count > 0 && (
                        <span
                          className={cn(
                            'ml-1 text-[0.7em] opacity-70',
                            isActive && 'text-primary-foreground opacity-90',
                          )}
                        >
                          ({count})
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 shrink-0"
                disabled={!canNext}
                onClick={() => navigateMonth(1)}
                aria-label="Další měsíc"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Active month heading */}
            <div className="mb-6 flex items-center justify-center gap-3">
              <h2 className="text-center font-heading text-3xl font-bold uppercase tracking-wider text-primary md:text-4xl">
                {MONTH_NAMES[selectedMonth] || ''}
              </h2>
              {isAdmin && (
                <EditAffordance
                  onAdd={() => openEditor({ kind: 'event', mode: 'create', prefill: { show_in_calendar: true } })}
                  addLabel="Přidat událost do kalendáře"
                />
              )}
            </div>

            {/* Events list */}
            <div className="space-y-3">
              {visibleEvents.length === 0 ? (
                <EmptyState title="V tomto měsíci nejsou žádné události" />
              ) : (
                visibleEvents.map((e) => {
                  const ruler = e.ruler_id ? rulerMap.get(e.ruler_id) : null;
                  return (
                    <div
                      key={e.id}
                      className="grid grid-cols-[80px_1fr] gap-5 rounded-lg border border-border bg-card/70 p-5 shadow-sm backdrop-blur-sm transition-all hover:border-primary/40 hover:shadow-md md:grid-cols-[100px_1fr]"
                    >
                      <div className="font-heading text-3xl font-bold text-primary md:text-4xl">
                        {formatYearLabel(e.year_text)}
                      </div>
                      <div className="min-w-0">
                        {isAdmin && (
                          <EditAffordance
                            size="sm"
                            className="float-right ml-1"
                            editLabel="Upravit událost"
                            deleteLabel="Smazat událost"
                            confirmTitle="Smazat událost?"
                            confirmDescription="Tato událost bude trvale odstraněna z databáze."
                            onEdit={() => openEditor({ kind: 'event', mode: 'edit', event: e })}
                            onDelete={() => deleteEvent.mutate(e.id)}
                          />
                        )}
                        <div className="text-base leading-relaxed">
                          {e.date_text && (
                            <span className="mr-2 font-heading font-bold text-accent">
                              {e.date_text}
                            </span>
                          )}
                          {e.calendar_text ? (
                            <span className="font-body text-foreground/90">{e.calendar_text}</span>
                          ) : (
                            <CellViewer html={e.content_html} className="inline font-body text-foreground/90" />
                          )}
                        </div>
                        {ruler && (
                          <div className="mt-2 font-accent text-sm italic text-muted-foreground">
                            Panovník: {ruler.name}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </article>
    </>
  );
}
