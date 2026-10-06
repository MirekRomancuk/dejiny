import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queryKeys';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loading } from '@/components/common/Loading';
import { EmptyState } from '@/components/common/EmptyState';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CalendarEntry } from '@/types/domain';

const MONTH_NAMES = [
  '— měsíc —',
  'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
  'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec',
];

export function CalendarListPage() {
  const qc = useQueryClient();
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [form, setForm] = useState<{ day: number; month: number; year_text: string; title: string; description_html: string }>({
    day: 1, month: 1, year_text: '', title: '', description_html: '',
  });

  const { data: entries, isLoading } = useQuery<CalendarEntry[]>({
    queryKey: qk.calendar,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .order('month').order('day');
      if (error) throw error;
      return (data ?? []) as CalendarEntry[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('calendar_events')
        .insert(form);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Záznam přidán');
      qc.invalidateQueries({ queryKey: qk.calendar });
      setForm((p) => ({ ...p, title: '', description_html: '', year_text: '' }));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('calendar_events').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Smazáno');
      qc.invalidateQueries({ queryKey: qk.calendar });
    },
  });

  const visible = filterMonth === 'all'
    ? (entries ?? [])
    : (entries ?? []).filter((e) => e.month === parseInt(filterMonth, 10));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-3xl">Kalendář</h1>
        <p className="text-sm text-muted-foreground">Denní záznamy zobrazené na veřejné stránce Kalendář.</p>
      </header>

      <section className="rounded-md border border-border bg-card p-4">
        <h2 className="mb-3 font-heading text-lg">Přidat záznam</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <Label htmlFor="day">Den</Label>
            <Input id="day" type="number" min={1} max={31} value={form.day} onChange={(e) => setForm((p) => ({ ...p, day: parseInt(e.target.value, 10) || 1 }))} />
          </div>
          <div>
            <Label>Měsíc</Label>
            <Select value={String(form.month)} onValueChange={(v) => setForm((p) => ({ ...p, month: parseInt(v, 10) }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.slice(1).map((m, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="year_text">Rok (volitelný)</Label>
            <Input id="year_text" value={form.year_text} onChange={(e) => setForm((p) => ({ ...p, year_text: e.target.value }))} placeholder="1212" />
          </div>
          <div>
            <Label htmlFor="title">Titulek</Label>
            <Input id="title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
          </div>
          <div className="sm:col-span-4">
            <Label htmlFor="desc">Popis (HTML/markdown)</Label>
            <Textarea id="desc" rows={3} value={form.description_html} onChange={(e) => setForm((p) => ({ ...p, description_html: e.target.value }))} />
          </div>
        </div>
        <Button className="mt-3" disabled={!form.title || create.isPending} onClick={() => create.mutate()}>
          <Plus className="mr-2 h-4 w-4" />
          {create.isPending ? 'Ukládám…' : 'Přidat'}
        </Button>
      </section>

      <section className="space-y-2">
        <div className="flex items-center gap-3">
          <h2 className="font-heading text-lg">Záznamy</h2>
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Všechny měsíce</SelectItem>
              {MONTH_NAMES.slice(1).map((m, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isLoading ? (
          <Loading />
        ) : visible.length === 0 ? (
          <EmptyState title="Žádné záznamy v kalendáři" />
        ) : (
          <div className="rounded-md border border-border bg-card">
            {visible.map((e) => (
              <div key={e.id} className="grid grid-cols-[60px_120px_1fr_50px] items-center gap-2 border-b border-border/40 px-3 py-2 text-sm last:border-0">
                <div className="font-heading text-primary">{e.day}.{e.month}.</div>
                <div className="text-xs text-muted-foreground">{e.year_text ?? ''}</div>
                <div>
                  <div className="font-heading">{e.title}</div>
                  {e.description_html && (
                    <div
                      className="cell-rich mt-0.5 text-xs text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: e.description_html }}
                    />
                  )}
                </div>
                <Button size="icon" variant="ghost" onClick={() => del.mutate(e.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
