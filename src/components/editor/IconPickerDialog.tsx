import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ICON_SVGS } from '@/lib/icons.generated';
import { cn } from '@/lib/cn';

interface Props {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  onSelectIcon: (name: string, size: number) => void;
  onSelectIconLink?: (name: string, href: string, title: string, size: number) => void;
}

// Use pre-generated SVG strings (same map as the runtime hydrator) → no lucide-react bundle bloat.
const CURATED_ICONS = Object.keys(ICON_SVGS);

export function IconPickerDialog({ open, onOpenChange, onSelectIcon, onSelectIconLink }: Props) {
  const [search, setSearch] = useState('');
  const [size, setSize] = useState(16);
  const [mode, setMode] = useState<'inline' | 'link'>('inline');
  const [linkHref, setLinkHref] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return CURATED_ICONS;
    return CURATED_ICONS.filter((n) => n.includes(q));
  }, [search]);

  function handleConfirm() {
    if (!selectedIcon) return;
    if (mode === 'link' && onSelectIconLink && linkHref) {
      onSelectIconLink(selectedIcon, linkHref, linkTitle, size);
    } else {
      onSelectIcon(selectedIcon, size);
    }
    setSelectedIcon(null);
    setLinkHref('');
    setLinkTitle('');
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Vložit ikonu</DialogTitle>
        </DialogHeader>

        {onSelectIconLink && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={mode === 'inline' ? 'default' : 'outline'}
              onClick={() => setMode('inline')}
              type="button"
            >
              Inline ikona
            </Button>
            <Button
              size="sm"
              variant={mode === 'link' ? 'default' : 'outline'}
              onClick={() => setMode('link')}
              type="button"
            >
              Klikatelná ikona (odkaz)
            </Button>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
          <Input
            placeholder="Hledat ikonu (anglicky: crown, sword, map…)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div>
            <Label htmlFor="iconsize" className="text-xs">Velikost (px)</Label>
            <Input
              id="iconsize"
              type="number"
              min={10}
              max={64}
              value={size}
              onChange={(e) => setSize(parseInt(e.target.value, 10) || 16)}
            />
          </div>
        </div>

        {mode === 'link' && (
          <div className="grid gap-2 rounded-md border border-border bg-muted/40 p-3">
            <div>
              <Label htmlFor="lhref" className="text-xs">URL odkazu</Label>
              <Input
                id="lhref"
                placeholder="https://…"
                value={linkHref}
                onChange={(e) => setLinkHref(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="ltitle" className="text-xs">Tooltip (volitelný)</Label>
              <Input
                id="ltitle"
                placeholder="Popis pro tooltip"
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
              />
            </div>
          </div>
        )}

        <Separator />

        <div className="max-h-[50vh] overflow-y-auto rounded-md border border-border p-2">
          <div className="grid grid-cols-6 gap-1 sm:grid-cols-8">
            {filtered.map((name) => {
              const svg = ICON_SVGS[name];
              if (!svg) return null;
              const isSelected = selectedIcon === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setSelectedIcon(name)}
                  className={cn(
                    'flex aspect-square flex-col items-center justify-center gap-1 rounded p-1 hover:bg-accent',
                    isSelected && 'bg-primary text-primary-foreground hover:bg-primary',
                  )}
                  title={name}
                >
                  <span
                    className="h-5 w-5"
                    dangerouslySetInnerHTML={{
                      __html: svg.replace(/width="\d+"/, 'width="20"').replace(/height="\d+"/, 'height="20"'),
                    }}
                  />
                  <span className="truncate text-[8px] opacity-70">{name}</span>
                </button>
              );
            })}
          </div>
          {filtered.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Žádná ikona neodpovídá.</p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} type="button">
            Zrušit
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedIcon || (mode === 'link' && !linkHref)}
            type="button"
          >
            Vložit{selectedIcon ? ` ${selectedIcon}` : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
