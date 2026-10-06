import { useState } from 'react';
import { Save, Trash2, Image as ImageIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImagePickerDialog } from '@/components/editor/ImagePickerDialog';
import { useBibliographyMutations } from '@/hooks/useBibliographyMutations';
import type { BibliographyEntry } from '@/types/domain';

interface Props {
  /** Editovaná kniha, nebo null/undefined pro novou. */
  initial?: BibliographyEntry | null;
  onSaved?: () => void;
  onDeleted?: () => void;
}

/** Formulář pro inline úpravu položky bibliografie (autor, titul, rok, obálka). */
export function BibliographyForm({ initial, onSaved, onDeleted }: Props) {
  const { save, del } = useBibliographyMutations();
  const [author, setAuthor] = useState(initial?.author ?? '');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [year, setYear] = useState<number | null>(initial?.year ?? null);
  const [imageUrl, setImageUrl] = useState<string | null>(initial?.image_url ?? null);
  const [pickerOpen, setPickerOpen] = useState(false);

  function handleSave() {
    save.mutate(
      { id: initial?.id, author, title, year, image_url: imageUrl },
      { onSuccess: () => onSaved?.() },
    );
  }

  function handleDelete() {
    if (!initial) return;
    if (!window.confirm(`Smazat „${initial.title}“?`)) return;
    del.mutate(initial.id, { onSuccess: () => onDeleted?.() });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="bib-author">Autor</Label>
        <Input
          id="bib-author"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Josef Žemlička"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="bib-title">Titul</Label>
        <Input
          id="bib-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Století posledních Přemyslovců"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="bib-year">Rok vydání</Label>
        <Input
          id="bib-year"
          type="number"
          value={year ?? ''}
          onChange={(e) => setYear(e.target.value ? parseInt(e.target.value, 10) : null)}
          placeholder="1986"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Obálka knihy</Label>
        {imageUrl ? (
          <div className="flex items-start gap-3 rounded-md border border-border bg-card/50 p-2">
            <img src={imageUrl} alt="" className="h-24 w-16 rounded border border-border object-cover" />
            <div className="flex-1 break-all text-xs text-muted-foreground">{imageUrl}</div>
            <Button size="icon" variant="ghost" onClick={() => setImageUrl(null)} aria-label="Odstranit obálku">
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

      <div className="flex justify-between gap-2 pt-2">
        {initial ? (
          <Button variant="outline" onClick={handleDelete} disabled={del.isPending}>
            <Trash2 className="mr-2 h-4 w-4" />
            Smazat
          </Button>
        ) : (
          <span />
        )}
        <Button onClick={handleSave} disabled={!author || !title || save.isPending}>
          <Save className="mr-2 h-4 w-4" />
          {save.isPending ? 'Ukládám…' : 'Uložit'}
        </Button>
      </div>

      <ImagePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        bucket="page-content"
        onSelect={(url) => setImageUrl(url)}
      />
    </div>
  );
}
