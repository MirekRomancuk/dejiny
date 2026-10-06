import { EventsTable } from '@/components/events/EventsTable';
import { FilterPanel } from '@/components/events/FilterPanel';
import { ViewToggle } from '@/components/events/ViewToggle';
import { TimelineView } from '@/components/timeline/TimelineView';
import { TimelineNight } from '@/components/timeline/TimelineNight';
import { HeroHeader } from '@/components/layout/HeroHeader';
import { useFilterState } from '@/hooks/useFilterState';

export function HomePage() {
  const { filters } = useFilterState();
  const isTimeline = filters.view === 'timeline';

  return (
    <>
      {/* Časová osa má vlastní pevné noční pozadí přes celý viewport
          (TimelineNight). V tabulkovém režimu běží noční „header band"
          z PublicLayoutu; kotvíme ho pod filtr + přepínač, ať noc sahá i za ně. */}
      {isTimeline && <TimelineNight />}
      <HeroHeader isNightAnchor={false} />
      <div className="mx-auto max-w-[1800px] px-4 py-6">
        {isTimeline ? (
          <>
            <FilterPanel />
            <ViewToggle />
            <TimelineView />
          </>
        ) : (
          <>
            {/* Kotva noční zóny: obsah (tabulka) pod ní leží na pergamenu. */}
            <div data-night-anchor="">
              <FilterPanel />
              <ViewToggle />
            </div>
            <EventsTable />
          </>
        )}
      </div>
    </>
  );
}
