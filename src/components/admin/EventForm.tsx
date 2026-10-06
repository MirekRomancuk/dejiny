import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Save, Trash2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { RichCellEditor } from '@/components/editor/RichCellEditor';
import { EventImagesEditor } from '@/components/admin/EventImagesEditor';
import { useAllEvents, useEventTypes, useRulers } from '@/hooks/useEvents';
import { autoRulerIdForYear, rulerIdsForYear, rulerSelectionRequired } from '@/lib/events/rulers';
import { parseYearNumeric, parseMonth } from '@/lib/year';
import { qk } from '@/lib/queryKeys';
import type { Event, EventInsert, ImageRef } from '@/types/domain';

interface Props {
  initial?: Event | null;
  mode: 'create' | 'edit';
  /** Předvyplnění při vytváření (např. rok z uzlu osy). */
  prefill?: Partial<Event>;
  /** Skryje horní hlavičku (šipka zpět + titul) — pro použití v draweru. */
  hideChrome?: boolean;
  /** Zavolá se po uložení místo navigace na admin routu. */
  onSaved?: (id: number) => void;
  /** Zavolá se po smazání místo navigace. */
  onDeleted?: () => void;
}

const EMPTY: Partial<Event> = {
  year_text: '',
  ruler_id: null,
  type_id: 0,
  date_text: '',
  content_html: '',
  wiki_url: '',
  wiki_label: '',
  maps_url: '',
  maps_label: '',
  toulky_url: '',
  highlight: null,
  osobnost: '',
  poznamka: '',
  image_refs: [],
  show_in_calendar: false,
  calendar_text: '',
  ordering: 0,
};

function normalizeImageRefs(raw: unknown): ImageRef[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (r): r is ImageRef => typeof r === 'object' && r !== null && 'url' in r && typeof (r as ImageRef).url === 'string',
  );
}

export function EventForm({ initial, mode, prefill, hideChrome, onSaved, onDeleted }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: typeMeta } = useEventTypes();
  const { data: rulers } = useRulers();
  const { data: allEvents } = useAllEvents();

  const [form, setForm] = useState<Partial<Event>>({ ...EMPTY, ...(initial ?? {}), ...(prefill ?? {}) });
  const [attempted, setAttempted] = useState(false);
  const [rulerTouched, setRulerTouched] = useState(
    () => mode === 'edit' || Object.prototype.hasOwnProperty.call(prefill ?? {}, 'ruler_id'),
  );

  const yearNumeric = parseYearNumeric(form.year_text ?? null);
  const yearRulerIds = useMemo(
    () => rulerIdsForYear(allEvents ?? [], yearNumeric),
    [allEvents, yearNumeric],
  );
  const yearRulerNames = useMemo(() => {
    const rulerNames = new Map((rulers ?? []).map((ruler) => [ruler.id, ruler.name]));
    return yearRulerIds.map((id) => rulerNames.get(id) ?? `Panovník #${id}`);
  }, [rulers, yearRulerIds]);
  const rulerLookupPending = mode === 'create' && yearNumeric !== null && allEvents === undefined;

  // U nové události přebíráme panovníka pouze tehdy, když je rok podle
  // existujících událostí jednoznačný. Ruční volbu ani editovaný záznam
  // automatika nikdy nepřepisuje.
  useEffect(() => {
    if (mode !== 'create' || rulerTouched || allEvents === undefined) return;
    const suggestedRulerId = autoRulerIdForYear(yearRulerIds);
    setForm((current) => (
      current.ruler_id === suggestedRulerId
        ? current
        : { ...current, ruler_id: suggestedRulerId }
    ));
  }, [allEvents, mode, rulerTouched, yearRulerIds]);

  useEffect(() => {
    if (initial) setForm({ ...EMPTY, ...initial });
  }, [initial]);

  function set<K extends keyof Event>(key: K, value: Event[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  const save = useMutation({
    mutationFn: async () => {
      const yearNumeric = parseYearNumeric(form.year_text ?? null);
      const month = parseMonth(form.date_text ?? null);
      const payload: EventInsert = {
        ...(form as EventInsert),
        year_numeric: yearNumeric,
        month: month,
        type_id: form.type_id!,
      };
      if (mode === 'edit' && initial) {
        const { error } = await supabase
          .from('events')
          .update(payload)
          .eq('id', initial.id);
        if (error) throw error;
        return initial.id;
      } else {
        const { data, error } = await supabase
          .from('events')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        return (data as { id: number }).id;
      }
    },
    onSuccess: (id) => {
      toast.success(mode === 'edit' ? 'Událost uložena' : 'Událost vytvořena');
      qc.invalidateQueries({ queryKey: qk.events.all });
      qc.invalidateQueries({ queryKey: qk.calendar });
      if (onSaved) onSaved(id);
      else navigate(`/admin/events/${id}`, { replace: true });
    },
    onError: (e: Error) => toast.error(`Uložení selhalo: ${e.message}`),
  });

  const del = useMutation({
    mutationFn: async () => {
      if (!initial) throw new Error('No id');
      const { error } = await supabase.from('events').delete().eq('id', initial.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Událost smazána');
      qc.invalidateQueries({ queryKey: qk.events.all });
      qc.invalidateQueries({ queryKey: qk.calendar });
      if (onDeleted) onDeleted();
      else navigate('/admin/events');
    },
    onError: (e: Error) => toast.error(`Smazání selhalo: ${e.message}`),
  });

  function handleDelete() {
    if (!initial) return;
    if (!window.confirm(`Opravdu smazat událost #${initial.id}? Akce je nevratná.`)) return;
    del.mutate();
  }

  // Typ je povinný vždy (DB NOT NULL). U nové události je povinný také panovník,
  // pokud už je pro daný rok doložen na některé existující události. Rok i text
  // jinak zůstávají volitelné — web se chybějícím informacím přizpůsobí.
  // Výjimka: je-li událost označena „Zobrazit v kalendáři“, musí mít rozpoznatelný
  // měsíc (z data), jinak by se do kalendáře vůbec nezařadila (tiše by „zmizela“).
  const calMonth = parseMonth(form.date_text ?? null);
  const errors = {
    type_id: form.type_id ? '' : 'Vyberte typ události.',
    ruler_id:
      mode === 'create' && rulerSelectionRequired(yearRulerIds, form.ruler_id ?? null)
        ? yearRulerIds.length === 1
          ? 'Pro tento rok je panovník známý. Vyberte ho, prosím.'
          : 'Tento rok má více panovníků. Vyberte, ke kterému nová událost patří.'
        : '',
    date_text:
      form.show_in_calendar && !(calMonth && calMonth >= 1 && calMonth <= 12)
        ? 'Pro zobrazení v kalendáři vyplňte datum s rozpoznatelným měsícem (např. 11.5. nebo „květen“).'
        : '',
  };
  const hasErrors = Boolean(errors.type_id || errors.ruler_id || errors.date_text || rulerLookupPending);

  function handleSave() {
    setAttempted(true);
    if (rulerLookupPending) {
      toast.error('Počkejte na ověření panovníka pro zadaný rok.');
      return;
    }
    if (hasErrors) {
      toast.error('Zkontrolujte povinná pole označená *.');
      return;
    }
    save.mutate();
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        {hideChrome ? (
          <span />
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/events')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="font-heading text-2xl">
              {mode === 'create' ? 'Nová událost' : `Úprava události #${initial?.id ?? ''}`}
            </h1>
          </div>
        )}
        <div className="flex gap-2">
          {mode === 'edit' && (
            <Button variant="outline" onClick={handleDelete} disabled={del.isPending}>
              <Trash2 className="mr-2 h-4 w-4" />
              Smazat
            </Button>
          )}
          <Button onClick={handleSave} disabled={save.isPending || rulerLookupPending}>
            <Save className="mr-2 h-4 w-4" />
            {save.isPending ? 'Ukládám…' : 'Uložit'}
          </Button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="year_text">Rok (text)</Label>
          <Input
            id="year_text"
            value={form.year_text ?? ''}
            onChange={(e) => set('year_text', e.target.value)}
            placeholder="např. 1212 nebo -50000 nebo „okolo r. 1200"
          />
          <p className="text-xs text-muted-foreground">
            Numerická hodnota se vypočítá: {parseYearNumeric(form.year_text ?? null) ?? '—'}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="date_text">Datum</Label>
          <Input
            id="date_text"
            value={form.date_text ?? ''}
            onChange={(e) => set('date_text', e.target.value)}
            placeholder="např. 11.5. nebo V."
            aria-invalid={attempted && !!errors.date_text}
            className={attempted && errors.date_text ? 'border-destructive' : undefined}
          />
          {attempted && errors.date_text ? (
            <p className="text-xs text-destructive">{errors.date_text}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Měsíc: {calMonth ?? '—'}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ordering">Pořadí v rámci roku</Label>
          <Input
            id="ordering"
            type="number"
            value={form.ordering ?? 0}
            onChange={(e) => set('ordering', parseInt(e.target.value, 10) || 0)}
          />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>
            Typ události <span className="text-destructive">*</span>
          </Label>
          <Select
            value={form.type_id ? String(form.type_id) : ''}
            onValueChange={(v) => set('type_id', parseInt(v, 10))}
          >
            <SelectTrigger
              aria-invalid={attempted && !!errors.type_id}
              className={attempted && errors.type_id ? 'border-destructive' : undefined}
            >
              <SelectValue placeholder="Vyberte typ…" />
            </SelectTrigger>
            <SelectContent>
              {(typeMeta?.list ?? []).map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {attempted && errors.type_id && <p className="text-xs text-destructive">{errors.type_id}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>
            Panovník
            {mode === 'create' && yearRulerIds.length > 0 && (
              <span className="text-destructive"> *</span>
            )}
          </Label>
          <Select
            value={form.ruler_id ? String(form.ruler_id) : 'none'}
            onValueChange={(v) => {
              setRulerTouched(true);
              set('ruler_id', v === 'none' ? null : parseInt(v, 10));
            }}
          >
            <SelectTrigger
              aria-invalid={attempted && !!errors.ruler_id}
              className={attempted && errors.ruler_id ? 'border-destructive' : undefined}
            >
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— bez panovníka —</SelectItem>
              {(rulers ?? []).map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {mode === 'create' && yearNumeric !== null && (
            attempted && errors.ruler_id ? (
              <p className="text-xs text-destructive">{errors.ruler_id}</p>
            ) : rulerLookupPending ? (
              <p className="text-xs text-muted-foreground">Ověřuji panovníka pro rok {yearNumeric}…</p>
            ) : yearRulerIds.length === 1 ? (
              <p className="text-xs text-muted-foreground">
                Podle ostatních událostí v tomto roce: {yearRulerNames[0]}.
              </p>
            ) : yearRulerIds.length > 1 ? (
              <p className="text-xs text-muted-foreground">
                Přechodový rok: {yearRulerNames.join(' · ')}. Vyberte panovníka pro tuto událost.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Pro tento rok zatím není panovník přiřazen; záznam lze uložit bez něj.
              </p>
            )
          )}
        </div>
      </section>

      <Separator />

      <section className="space-y-3">
        <div>
          <Label className="font-heading text-base">Zvýraznění události</Label>
          <p className="text-xs text-muted-foreground">
            Vizuálně zvýrazní řádek na hlavní stránce zelenou (kladné) nebo červenou (záporné).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={!form.highlight ? 'default' : 'outline'}
            size="sm"
            onClick={() => set('highlight', null)}
          >
            Bez zvýraznění
          </Button>
          <Button
            type="button"
            variant={form.highlight === 'positive' ? 'default' : 'outline'}
            size="sm"
            onClick={() => set('highlight', 'positive')}
            className={form.highlight === 'positive' ? 'bg-green-600 hover:bg-green-700 text-white' : 'border-green-600/40 text-green-700 hover:bg-green-500/10'}
          >
            ✓ Kladné (zelená)
          </Button>
          <Button
            type="button"
            variant={form.highlight === 'negative' ? 'destructive' : 'outline'}
            size="sm"
            onClick={() => set('highlight', 'negative')}
            className={form.highlight === 'negative' ? '' : 'border-destructive/40 text-destructive hover:bg-destructive/10'}
          >
            ⚠ Záporné (červená)
          </Button>
        </div>
      </section>

      <Separator />

      <section className="space-y-2">
        <Label>Text události</Label>
        <RichCellEditor
          value={form.content_html ?? ''}
          onChange={(html) => set('content_html', html)}
          placeholder="Popis události s formátováním, ikonami a obrázky…"
          minHeight={200}
        />
      </section>

      <Separator />

      <section className="space-y-2">
        <EventImagesEditor
          value={normalizeImageRefs(form.image_refs)}
          onChange={(next) => set('image_refs', next as unknown as Event['image_refs'])}
        />
      </section>

      <Separator />

      <section className="space-y-3">
        <Label className="font-heading text-base">Externí odkazy</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="wiki_url" className="text-xs text-muted-foreground">Wikipedia URL</Label>
            <Input id="wiki_url" value={form.wiki_url ?? ''} onChange={(e) => set('wiki_url', e.target.value)} placeholder="https://cs.wikipedia.org/wiki/…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="maps_url" className="text-xs text-muted-foreground">Mapy.cz URL</Label>
            <Input id="maps_url" value={form.maps_url ?? ''} onChange={(e) => set('maps_url', e.target.value)} placeholder="https://mapy.cz/…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="toulky_url" className="text-xs text-muted-foreground">Toulky českou minulostí (Český rozhlas)</Label>
            <Input id="toulky_url" value={form.toulky_url ?? ''} onChange={(e) => set('toulky_url', e.target.value)} placeholder="https://dvojka.rozhlas.cz/…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wiki_label" className="text-xs text-muted-foreground">Wiki popis (tooltip)</Label>
            <Input id="wiki_label" value={form.wiki_label ?? ''} onChange={(e) => set('wiki_label', e.target.value)} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="osobnost">Osobnost (text)</Label>
          <Textarea id="osobnost" value={form.osobnost ?? ''} onChange={(e) => set('osobnost', e.target.value)} rows={3} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="poznamka">Poznámka</Label>
          <Textarea id="poznamka" value={form.poznamka ?? ''} onChange={(e) => set('poznamka', e.target.value)} rows={3} />
        </div>
      </section>

      <Separator />

      <section className="space-y-3 rounded-md border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="show_in_calendar"
            checked={form.show_in_calendar ?? false}
            onCheckedChange={(c) => set('show_in_calendar', c === true)}
          />
          <Label htmlFor="show_in_calendar" className="cursor-pointer">Zobrazit v kalendáři</Label>
        </div>
        {form.show_in_calendar && (
          <div className="space-y-1.5">
            <Label htmlFor="calendar_text">Text pro kalendář</Label>
            <Textarea
              id="calendar_text"
              value={form.calendar_text ?? ''}
              onChange={(e) => set('calendar_text', e.target.value)}
              rows={3}
              placeholder="Krátký text zobrazený na stránce Kalendář."
            />
          </div>
        )}
      </section>
    </div>
  );
}
