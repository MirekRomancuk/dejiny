import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Save, ArrowLeft, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queryKeys';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loading } from '@/components/common/Loading';
import { EmptyState } from '@/components/common/EmptyState';
import { PageEditor } from '@/components/editor/PageEditor';
import { BackgroundPicker } from '@/components/admin/BackgroundPicker';
import type { Page } from '@/types/domain';

interface Background {
  type: 'color' | 'image';
  value: string;
  position?: 'cover' | 'contain' | 'tile';
}

const DEFAULT_BG: Background = { type: 'color', value: 'hsl(36 33% 92%)' };

export function PageEditPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: page, isLoading } = useQuery<Page | null>({
    queryKey: qk.pages.one(slug ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase.from('pages').select('*').eq('slug', slug!).maybeSingle();
      if (error) throw error;
      return (data ?? null) as Page | null;
    },
    enabled: !!slug,
  });

  const [title, setTitle] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [background, setBackground] = useState<Background>(DEFAULT_BG);

  useEffect(() => {
    if (page) {
      setTitle(page.title);
      setContentHtml(page.content_html);
      const bg = page.background as unknown;
      if (bg && typeof bg === 'object') {
        setBackground(bg as Background);
      }
    }
  }, [page]);

  const save = useMutation({
    mutationFn: async () => {
      if (!page) throw new Error('No page');
      const { error } = await supabase
        .from('pages')
        // @ts-expect-error - typing wired in F10 via generate_typescript_types
        .update({ title, content_html: contentHtml, background })
        .eq('slug', page.slug);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Stránka uložena');
      qc.invalidateQueries({ queryKey: qk.pages.all });
      qc.invalidateQueries({ queryKey: qk.pages.one(slug ?? '') });
    },
    onError: (e: Error) => toast.error(`Uložení selhalo: ${e.message}`),
  });

  if (isLoading) return <Loading />;
  if (!page) return <EmptyState title="Stránka nenalezena" />;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/pages')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="font-heading text-2xl">
            Úprava: <code className="rounded bg-muted px-1.5 py-0.5 text-base">{page.slug}</code>
          </h1>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <a href={`/${page.slug}`} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" /> Náhled
            </a>
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {save.isPending ? 'Ukládám…' : 'Uložit'}
          </Button>
        </div>
      </header>

      <section className="space-y-1.5">
        <Label htmlFor="title">Titulek</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
      </section>

      <section className="space-y-2">
        <Label>Obsah</Label>
        <PageEditor value={contentHtml} onChange={setContentHtml} />
      </section>

      <section>
        <BackgroundPicker value={background} onChange={setBackground} />
      </section>
    </div>
  );
}
