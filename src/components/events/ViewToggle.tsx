import { Table2, Milestone } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useFilterState, type EventsView } from '@/hooks/useFilterState';
import { cn } from '@/lib/cn';

const OPTIONS: { value: EventsView; label: string; icon: LucideIcon }[] = [
  { value: 'table', label: 'Tabulka', icon: Table2 },
  { value: 'timeline', label: 'Časová osa', icon: Milestone },
];

/** Přepínač zobrazení událostí: tabulka vs. časová osa (kronika). Stav v URL (?view). */
export function ViewToggle() {
  const { filters, setFilter } = useFilterState();

  return (
    <div className="mb-4 flex justify-end">
      <div
        role="tablist"
        aria-label="Zobrazení událostí"
        data-night-chrome
        className="inline-flex rounded-lg border border-border bg-card/60 p-1 shadow-sm backdrop-blur-sm"
      >
        {OPTIONS.map(({ value, label, icon: Icon }) => {
          const active = filters.view === value;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter('view', value)}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-1.5 font-heading text-xs font-semibold uppercase tracking-wider transition-colors md:text-sm',
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
