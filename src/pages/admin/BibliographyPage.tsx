import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Library, Plus, Trash2, ArrowUp, ArrowDown, Image as ImageIcon, X, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queryKeys';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loading } from '@/components/common/Loading';
import { EmptyState } from '@/components/common/EmptyState';
import { ImagePickerDialog } from '@/components/editor/ImagePickerDialog';
import { useBibliographyMutations } from '@/hooks/useBibliographyMutations';
import { getBibliographyOrderUpdates } from '@/lib/bibliography';
import type { BibliographyEntry } from '@/types/domain';

type EditBook = Omit<BibliographyEntry, 'id' | 'created_at' | 'updated_at'> & { id?: number };

const EMPTY: EditBook = {
  author: '',
  title: '',
  year: null,
  image_url: null,
  display_order: 0,
};

export function BibliographyPage() {
  const [editing, setEditing] = useState<EditBook | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const { data: books, isLoading } = useQuery<BibliographyEntry[]>({
    queryKey: qk.bibliography,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bibliography')
        .select('*')
        .order('display_order')
        .order('id');
      if (error) throw error;
      return (data ?? []) as BibliographyEntry[];
    },
  });

  const { save, del, reorder } = useBibliographyMutations();

  async function move(idx: number, direction: -1 | 1) {
    if (!books) return;
    const target = idx + direction;
    if (target < 0 || target >= books.length) return;
    const updates = getBibliographyOrderUpdates(books, idx, direction);
    if (updates.length === 2) await reorder.mutateAsync(updates);
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl">Použitá literatura</h1>
          <p className="text-sm text-muted-foreground">
            Seznam knih zobrazený v sekci „Použitá literatura" na stránce Popis.
          </p>
        </div>
        <Button onClick={() => setEditing({ ...EMPTY })}>
          <Plus className="mr-2 h-4 w-4" />
          Nová kniha
        </Button>
      </header>

      {isLoading ? (
        <Loading />
      ) : !books?.length ? (
        <EmptyState
          title="Žádné záznamy"
          description="Přidej první knihu tlačítkem nahoře."
          action={
            <Button onClick={() => setEditing({ ...EMPTY })}>
              <Plus className="mr-2 h-4 w-4" />
              Přidat knihu
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {books.map((b, i) => (
            <div
              key={b.id}
              className="grid grid-cols-[60px_72px_1fr_auto] items-center gap-3 rounded-lg border border-border bg-card/70 p-3 shadow-sm"
            >
              <div className="flex flex-col gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  disabled={i === 0 || reorder.isPending}
                  onClick={() => move(i, -1)}
                  aria-label="Posunout nahoru"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  disabled={i === books.length - 1 || reorder.isPending}
                  onClick={() => move(i, 1)}
                  aria-label="Posunout dolů"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
              </div>
              {b.image_url ? (
                <img
                  src={b.image_url}
                  alt={b.title}
                  className="h-20 w-14 rounded border border-border bg-background object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-20 w-14 items-center justify-center rounded border border-dashed border-border bg-muted/30 text-muted-foreground">
                  <Library className="h-5 w-5 opacity-30" />
                </div>
              )}
              <div className="min-w-0">
                <div className="truncate font-heading font-semibold text-foreground">{b.title}</div>
                <div className="truncate text-sm text-muted-foreground">{b.author}</div>
                {b.year && <div className="font-accent text-xs italic text-accent">{b.year}</div>}
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => setEditing(b)}>
                  Upravit
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => {
                    if (window.confirm(`Smazat „${b.title}"?`)) del.mutate(b.id);
                  }}
                  aria-label="Smazat"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit dialog */}
      {editing && (
        <Dialog open onOpenChange={(v) => !v && setEditing(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing.id ? 'Upravit knihu' : 'Nová kniha'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="bib-author">Autor</Label>
                <Input
                  id="bib-author"
                  value={editing.author}
                  onChange={(e) => setEditing({ ...editing, author: e.target.value })}
                  placeholder="Josef Žemlička"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bib-title">Titul</Label>
                <Input
                  id="bib-title"
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  placeholder="Století posledních Přemyslovců"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bib-year">Rok vydání</Label>
                <Input
                  id="bib-year"
                  type="number"
                  value={editing.year ?? ''}
                  onChange={(e) => setEditing({ ...editing, year: e.target.value ? parseInt(e.target.value, 10) : null })}
                  placeholder="1986"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Obálka knihy</Label>
                {editing.image_url ? (
                  <div className="flex items-start gap-3 rounded-md border border-border bg-card/50 p-2">
                    <img src={editing.image_url} alt="" className="h-24 w-16 rounded border border-border object-cover" />
                    <div className="flex-1 break-all text-xs text-muted-foreground">{editing.image_url}</div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditing({ ...editing, image_url: null })}
                      aria-label="Odstranit obálku"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" onClick={() => setPickerOpen(true)}>
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Vybrat obálku z knihovny
                  </Button>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>
                Zrušit
              </Button>
              <Button
                onClick={() => save.mutate(editing, { onSuccess: () => setEditing(null) })}
                disabled={!editing.author || !editing.title || save.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                {save.isPending ? 'Ukládám…' : 'Uložit'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <ImagePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        bucket="page-content"
        onSelect={(url) => editing && setEditing({ ...editing, image_url: url })}
      />
    </div>
  );
}
