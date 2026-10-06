import { Filter, Search, ChevronsUpDown, Check } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useRulers } from '@/hooks/useEvents';
import { useFilterState } from '@/hooks/useFilterState';
import { TYPE_CODES, TYPE_LABELS_SHORT } from '@/types/domain';
import { cn } from '@/lib/cn';

/**
 * Inline filter bar above the events table. All filters visible at once — matches the reference
 * site (czech-crown-chronicle.base44.app) layout: search · year-from · year-to · ruler · columns.
 */
export function FilterPanel() {
  const { filters, setFilter } = useFilterState();
  const { data: rulers } = useRulers();
  const [rulerOpen, setRulerOpen] = useState(false);
  const [colsOpen, setColsOpen] = useState(false);

  const selectedRuler = rulers?.find((r) => r.id === filters.rulerId);

  return (
    <div data-night-chrome className="mb-4 rounded-lg border border-border bg-card/60 p-3 shadow-sm backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
        {/* Search */}
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Hledat v událostech..."
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
            className="pl-9 font-body"
          />
        </div>

        {/* Year from */}
        <Input
          type="number"
          placeholder="Rok od"
          value={filters.yearFrom ?? ''}
          onChange={(e) => setFilter('yearFrom', e.target.value === '' ? null : parseInt(e.target.value, 10))}
          className="w-24 font-body text-sm"
        />
        <span className="text-muted-foreground">–</span>
        <Input
          type="number"
          placeholder="Rok do"
          value={filters.yearTo ?? ''}
          onChange={(e) => setFilter('yearTo', e.target.value === '' ? null : parseInt(e.target.value, 10))}
          className="w-24 font-body text-sm"
        />

        {/* Ruler combobox */}
        <Popover open={rulerOpen} onOpenChange={setRulerOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="min-w-[180px] justify-between font-body" role="combobox">
              <span className="truncate">{selectedRuler?.name ?? 'Všichni panovníci'}</span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[280px] p-0" align="end">
            <Command
              filter={(text, search) =>
                text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(
                  search.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''),
                )
                  ? 1
                  : 0
              }
            >
              <CommandInput placeholder="Hledat panovníka…" />
              <CommandList>
                <CommandEmpty>Nenalezeno.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      setFilter('rulerId', null);
                      setRulerOpen(false);
                    }}
                  >
                    <Check className={cn('mr-2 h-4 w-4', filters.rulerId === null ? 'opacity-100' : 'opacity-0')} />
                    Všichni panovníci
                  </CommandItem>
                  {(rulers ?? []).map((r) => (
                    <CommandItem
                      key={r.id}
                      value={r.name}
                      onSelect={() => {
                        setFilter('rulerId', r.id);
                        setRulerOpen(false);
                      }}
                    >
                      <Check className={cn('mr-2 h-4 w-4', filters.rulerId === r.id ? 'opacity-100' : 'opacity-0')} />
                      <span className="flex-1 truncate">{r.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Sloupce — jen v tabulce (časová osa ukazuje všechny kategorie) */}
        {filters.view !== 'timeline' && (
        <Popover open={colsOpen} onOpenChange={setColsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2 font-body">
              <Filter className="h-4 w-4" />
              Sloupce
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[260px]" align="end">
            <div className="space-y-2">
              {TYPE_CODES.map((code) => {
                const checked = filters.typeCodes.includes(code);
                return (
                  <div key={code} className="flex items-center gap-2">
                    <Checkbox
                      id={`col-${code}`}
                      checked={checked}
                      onCheckedChange={(c) => {
                        const next = c
                          ? TYPE_CODES.filter((t) => filters.typeCodes.includes(t) || t === code)
                          : filters.typeCodes.filter((t) => t !== code);
                        setFilter('typeCodes', next);
                      }}
                    />
                    <Label htmlFor={`col-${code}`} className="cursor-pointer font-body">
                      {TYPE_LABELS_SHORT[code]}
                    </Label>
                  </div>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
        )}
      </div>
    </div>
  );
}
