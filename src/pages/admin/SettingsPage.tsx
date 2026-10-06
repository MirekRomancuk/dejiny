import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queryKeys';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loading } from '@/components/common/Loading';

interface Setting { key: string; value: unknown }

export function SettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<Setting[]>({
    queryKey: qk.settings,
    queryFn: async () => {
      const { data, error } = await supabase.from('settings').select('*');
      if (error) throw error;
      return (data ?? []) as Setting[];
    },
  });

  const [title, setTitle] = useState('');
  const [footer, setFooter] = useState('');

  useEffect(() => {
    if (!data) return;
    const t = data.find((s) => s.key === 'site_title')?.value;
    const f = data.find((s) => s.key === 'footer_text')?.value;
    setTitle(typeof t === 'string' ? t : '');
    setFooter(typeof f === 'string' ? f : '');
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const payload: Array<{ key: string; value: unknown }> = [
        { key: 'site_title', value: title },
        { key: 'footer_text', value: footer },
      ];
      const { error } = await supabase
        .from('settings')
        // @ts-expect-error - typings wired in F10 via generate_typescript_types
        .upsert(payload, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Nastavení uloženo');
      qc.invalidateQueries({ queryKey: qk.settings });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <Loading />;

  return (
    <div className="max-w-2xl space-y-5">
      <header>
        <h1 className="font-heading text-3xl">Nastavení</h1>
        <p className="text-sm text-muted-foreground">Globální nastavení webu.</p>
      </header>
      <section className="space-y-1.5">
        <Label htmlFor="title">Název webu</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
      </section>
      <section className="space-y-1.5">
        <Label htmlFor="footer">Patička</Label>
        <Textarea id="footer" rows={2} value={footer} onChange={(e) => setFooter(e.target.value)} />
      </section>
      <Button onClick={() => save.mutate()} disabled={save.isPending}>
        <Save className="mr-2 h-4 w-4" />
        {save.isPending ? 'Ukládám…' : 'Uložit'}
      </Button>
    </div>
  );
}
