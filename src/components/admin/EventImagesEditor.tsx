import { useState } from 'react';
import { ImagePlus, Trash2, GripVertical, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImagePickerDialog } from '@/components/editor/ImagePickerDialog';
import { cn } from '@/lib/cn';
import type { ImageRef } from '@/types/domain';

interface Props {
  value: ImageRef[];
  onChange: (next: ImageRef[]) => void;
}

export function EventImagesEditor({ value, onChange }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);

  function move(from: number, to: number) {
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }

  function updateAt(i: number, patch: Partial<ImageRef>) {
    const next = [...value];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  }

  function removeAt(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  function addImage(url: string, alt?: string) {
    onChange([...value, { url, alt: alt ?? '' }]);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Obrázky události</Label>
        <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
          <ImagePlus className="mr-2 h-4 w-4" />
          Přidat obrázek
        </Button>
      </div>

      {value.length === 0 ? (
        <div className="flex items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/20 py-6 text-sm text-muted-foreground">
          <ImageIcon className="h-4 w-4" />
          Žádné obrázky. Klikněte „Přidat obrázek".
        </div>
      ) : (
        <ul className="space-y-2">
          {value.map((img, i) => (
            <li
              key={`${img.url}-${i}`}
              className="flex items-start gap-3 rounded-md border border-border bg-card/70 p-2"
            >
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => move(i, i - 1)}
                  disabled={i === 0}
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent/20',
                    i === 0 && 'opacity-30',
                  )}
                  aria-label="Posunout nahoru"
                >
                  ▲
                </button>
                <GripVertical className="mx-auto h-3 w-3 text-muted-foreground/40" />
                <button
                  type="button"
                  onClick={() => move(i, i + 1)}
                  disabled={i === value.length - 1}
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent/20',
                    i === value.length - 1 && 'opacity-30',
                  )}
                  aria-label="Posunout dolů"
                >
                  ▼
                </button>
              </div>
              <img
                src={img.url}
                alt={img.alt ?? ''}
                className="h-16 w-16 shrink-0 rounded border border-border bg-background object-cover"
                loading="lazy"
              />
              <div className="flex-1 space-y-1.5">
                <Input
                  value={img.alt ?? ''}
                  onChange={(e) => updateAt(i, { alt: e.target.value })}
                  placeholder="Popisek (alt text)"
                  className="h-8 text-sm"
                />
                <Input
                  value={img.caption ?? ''}
                  onChange={(e) => updateAt(i, { caption: e.target.value })}
                  placeholder="Titulek pod obrázkem (volitelný)"
                  className="h-8 text-sm"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeAt(i)}
                aria-label="Odstranit obrázek"
                className="h-8 w-8 text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <ImagePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        bucket="event-images"
        onSelect={(url, alt) => addImage(url, alt)}
      />
    </div>
  );
}
