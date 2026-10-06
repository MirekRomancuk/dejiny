import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/cn';
import type { Ruler } from '@/types/domain';

interface Props {
  rulers: Ruler[];
  value: number | null;
  onChange: (id: number | null) => void;
}

export function RulerFilter({ rulers, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const selected = rulers.find((r) => r.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between">
          <span className="truncate">{selected ? selected.name : 'Vyberte panovníka…'}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
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
                  onChange(null);
                  setOpen(false);
                }}
              >
                <Check className={cn('mr-2 h-4 w-4', value === null ? 'opacity-100' : 'opacity-0')} />
                Všichni
              </CommandItem>
              {rulers.map((r) => (
                <CommandItem
                  key={r.id}
                  value={r.name}
                  onSelect={() => {
                    onChange(r.id);
                    setOpen(false);
                  }}
                >
                  <Check className={cn('mr-2 h-4 w-4', value === r.id ? 'opacity-100' : 'opacity-0')} />
                  <span className="flex-1 truncate">{r.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
