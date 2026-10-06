import { useState } from 'react';
import { Save, Trash2, Image as ImageIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageEditor } from '@/components/editor/PageEditor';
import { ImagePickerDialog } from '@/components/editor/ImagePickerDialog';
import { useBlockMutations } from '@/hooks/usePageBlocks';
import { BLOCK_FIELDS, EXTERNAL_LINK_ICONS, emptyBlockData } from './blockKinds';
import type { BlockKind, PageBlock } from '@/types/domain';

interface Props {
  pageSlug: string;
  blockKind: BlockKind;
  initial?: PageBlock | null;
  onSaved: () => void;
  onDeleted: () => void;
}

/** Adaptivní formulář pro komponentu stránky — pole se řídí druhem bloku. */
export function BlockForm({ pageSlug, blockKind, initial, onSaved, onDeleted }: Props) {
  const { save, del } = useBlockMutations(pageSlug);
  const fields = BLOCK_FIELDS[blockKind];
  const [data, setData] = useState<Record<string, string>>(
    initial ? { ...(initial.data as Record<string, string>) } : emptyBlockData(blockKind),
  );
  const [activeImageKey, setActiveImageKey] = useState<string | null>(null);

  function set(key: string, value: string) {
    setData((d) => ({ ...d, [key]: value }));
  }

  // Prázdný rich-text z TipTapu je '<p></p>' — po odstranění tagů nezbude nic.
  const isRichEmpty = (html: string) => !html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  const fieldEmpty = (key: string, type: string) => {
    const v = data[key] ?? '';
    return type === 'rich' ? isRichEmpty(v) : !v.trim();
  };
  // Krátká pole (nadpis, termín, formát, datum, ikona) jsou povinná. Druhy bez takového
  // pole (úvod, mapa) vyžadují, aby aspoň jedno pole neslo obsah — nešel uložit prázdný blok.
  const hasShortField = fields.some((f) => f.type === 'text' || f.type === 'iconSelect');
  const missingRequired = hasShortField
    ? fields.some((f) => (f.type === 'text' || f.type === 'iconSelect') && !(data[f.key] ?? '').trim())
    : !fields.some((f) => !fieldEmpty(f.key, f.type));

  function handleSave() {
    save.mutate({ id: initial?.id, kind: blockKind, data }, { onSuccess: () => onSaved() });
  }

  function handleDelete() {
    if (!initial) return;
    if (!window.confirm('Opravdu smazat tuto komponentu?')) return;
    del.mutate(initial.id, { onSuccess: () => onDeleted() });
  }

  return (
    <div className="space-y-4">
      {fields.map((f) => (
        <div key={f.key} className="space-y-1.5">
          <Label>{f.label}</Label>
          {f.type === 'text' && (
            <Input value={data[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} />
          )}
          {f.type === 'textarea' && (
            <Textarea
              value={data[f.key] ?? ''}
              onChange={(e) => set(f.key, e.target.value)}
              placeholder={f.placeholder}
              rows={4}
            />
          )}
          {f.type === 'rich' && (
            <PageEditor value={data[f.key] ?? ''} onChange={(html) => set(f.key, html)} placeholder={f.placeholder} />
          )}
          {f.type === 'iconSelect' && (
            <Select value={data[f.key] ?? 'external'} onValueChange={(v) => set(f.key, v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXTERNAL_LINK_ICONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {f.type === 'image' && (
            <>
              {data[f.key] ? (
                <div className="flex items-start gap-3 rounded-md border border-border bg-card/50 p-2">
                  <img src={data[f.key]} alt="" className="h-24 w-24 rounded border border-border object-contain" />
                  <div className="flex-1 break-all text-xs text-muted-foreground">{data[f.key]}</div>
                  <Button size="icon" variant="ghost" onClick={() => set(f.key, '')} aria-label="Odstranit obrázek">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button type="button" variant="outline" onClick={() => setActiveImageKey(f.key)}>
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Vybrat obrázek z knihovny
                </Button>
              )}
            </>
          )}
        </div>
      ))}

      <div className="flex justify-between gap-2 pt-2">
        {initial ? (
          <Button variant="outline" onClick={handleDelete} disabled={del.isPending}>
            <Trash2 className="mr-2 h-4 w-4" />
            Smazat
          </Button>
        ) : (
          <span />
        )}
        <Button onClick={handleSave} disabled={missingRequired || save.isPending}>
          <Save className="mr-2 h-4 w-4" />
          {save.isPending ? 'Ukládám…' : 'Uložit'}
        </Button>
      </div>

      {fields.some((field) => field.type === 'image') && (
        <ImagePickerDialog
          open={activeImageKey !== null}
          onOpenChange={(open) => {
            if (!open) setActiveImageKey(null);
          }}
          bucket="page-content"
          onSelect={(url) => {
            if (activeImageKey) set(activeImageKey, url);
            setActiveImageKey(null);
          }}
        />
      )}
    </div>
  );
}
