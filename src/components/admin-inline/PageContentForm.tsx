import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queryKeys';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageEditor } from '@/components/editor/PageEditor';
import { usePageMutation } from '@/hooks/usePageMutation';

interface Props {
  slug: string;
  /** Když false, skryje editor obsahu (např. Kalendář nemá vlastní HTML obsah). */
  hasContent?: boolean;
  onSaved?: () => void;
}

interface PageData {
  title: string;
  subtitle: string | null;
  content_html: string;
}

/** Formulář pro inline úpravu stránky (title + subtitle + volitelný content_html). */
export function PageContentForm({ slug, hasContent = true, onSaved }: Props) {
  const { data: page, isLoading } = useQuery({
    queryKey: qk.pages.one(slug),
    queryFn: async () => {
      const { data, error } = await supabase.from('pages').select('*').eq('slug', slug).maybeSingle();
      if (error) throw error;
      return (data as PageData | null) ?? null;
    },
  });
  const save = usePageMutation(slug);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [html, setHtml] = useState('');

  useEffect(() => {
    if (page) {
      setTitle(page.title ?? '');
      setSubtitle(page.subtitle ?? '');
      setHtml(page.content_html ?? '');
    }
  }, [page]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Načítám obsah stránky…</p>;

  function handleSave() {
    const payload: { title: string; subtitle: string | null; content_html?: string } = {
      title,
      subtitle: subtitle.trim() ? subtitle : null,
    };
    if (hasContent) payload.content_html = html;
    save.mutate(payload, { onSuccess: () => onSaved?.() });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="page-title">Titulek v hlavičce</Label>
        <Input id="page-title" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="page-subtitle">Podtitulek v hlavičce</Label>
        <Input
          id="page-subtitle"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          placeholder="Krátký popisek pod titulkem…"
        />
      </div>
      {hasContent && (
        <div className="space-y-1.5">
          <Label>Obsah</Label>
          <PageEditor value={html} onChange={setHtml} placeholder="Obsah stránky…" />
        </div>
      )}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={save.isPending}>
          <Save className="mr-2 h-4 w-4" />
          {save.isPending ? 'Ukládám…' : 'Uložit'}
        </Button>
      </div>
    </div>
  );
}
