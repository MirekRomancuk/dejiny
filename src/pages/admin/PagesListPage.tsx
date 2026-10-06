import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Edit2, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queryKeys';
import { Loading } from '@/components/common/Loading';
import { Button } from '@/components/ui/button';
import type { Page } from '@/types/domain';

export function PagesListPage() {
  const { data, isLoading } = useQuery<Page[]>({
    queryKey: qk.pages.all,
    queryFn: async () => {
      const { data, error } = await supabase.from('pages').select('*').order('slug');
      if (error) throw error;
      return (data ?? []) as Page[];
    },
  });

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-heading text-3xl">Stránky (CMS)</h1>
        <p className="text-sm text-muted-foreground">
          Editovatelný obsah veřejných stránek - Popis, Vysvětlivky, Verze, Kalendář, Home.
        </p>
      </header>

      <div className="rounded-md border border-border bg-card">
        <div className="grid grid-cols-[1fr_2fr_120px_140px] gap-2 border-b border-border bg-secondary/30 px-3 py-2 font-heading text-xs uppercase tracking-wide text-muted-foreground">
          <div>Slug</div>
          <div>Titulek</div>
          <div>Aktualizováno</div>
          <div className="text-right">Akce</div>
        </div>
        {(data ?? []).map((p) => (
          <div
            key={p.id}
            className="grid grid-cols-[1fr_2fr_120px_140px] items-center gap-2 border-b border-border/40 px-3 py-2.5 text-sm hover:bg-accent/30"
          >
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{p.slug}</code>
            <span className="font-heading">{p.title}</span>
            <span className="text-xs text-muted-foreground">
              {new Date(p.updated_at).toLocaleDateString('cs-CZ')}
            </span>
            <div className="flex justify-end gap-1">
              <Button asChild size="icon" variant="ghost">
                <Link to={`/${p.slug}`} target="_blank" aria-label="Zobrazit">
                  <Eye className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="icon" variant="ghost">
                <Link to={`/admin/pages/${p.slug}`} aria-label="Upravit">
                  <Edit2 className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
