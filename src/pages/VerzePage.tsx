import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queryKeys';
import { HeroHeader } from '@/components/layout/HeroHeader';
import { PageEditButton } from '@/components/admin-inline/PageEditButton';
import { AddBlockButton, BlockEditAffordance } from '@/components/admin-inline/blockAffordances';
import { usePageBlocks, blocksOfKind } from '@/hooks/usePageBlocks';
import { Loading } from '@/components/common/Loading';
import { EmptyState } from '@/components/common/EmptyState';
import { CellViewer } from '@/components/events/CellViewer';
import { useProfile } from '@/hooks/useSession';
import type { Page, TypedBlock } from '@/types/domain';

function yearOf(date: string): number | null {
  const m = date.match(/(\d{4})/);
  return m ? parseInt(m[1], 10) : null;
}
function isoOf(date: string): string {
  const m = date.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (!m) return date;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

export function VerzePage() {
  const { isAdmin } = useProfile();
  const { data: page } = useQuery<Page | null>({
    queryKey: qk.pages.one('verze'),
    queryFn: async () => {
      const { data, error } = await supabase.from('pages').select('*').eq('slug', 'verze').maybeSingle();
      if (error) throw error;
      return (data ?? null) as Page | null;
    },
  });

  const { data: blocks = [], isLoading } = usePageBlocks('verze');
  const hasBlocks = blocks.length > 0;
  const changelog = blocksOfKind(blocks, 'changelog');

  // Bloky seskupené po letech (nejnovější nahoře).
  const grouped = useMemo(() => {
    const map = new Map<number, TypedBlock<'changelog'>[]>();
    for (const b of changelog) {
      const y = yearOf(b.data.date) ?? 0;
      const arr = map.get(y) ?? [];
      arr.push(b);
      map.set(y, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => isoOf(b.data.date).localeCompare(isoOf(a.data.date)));
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [changelog]);

  return (
    <>
      <HeroHeader
        pageTitle={page?.title?.trim() || 'VERZE'}
        pageSubtitle={page?.subtitle?.trim() || 'Přehled aktualizací obsahu'}
      />
      <PageEditButton slug="verze" label="Verze" hasContent={false} />
      <article className="mx-auto max-w-4xl px-4 py-10">
        {isLoading ? (
          <Loading />
        ) : hasBlocks || isAdmin ? (
          <div className="space-y-12">
            <div className="flex justify-end">
              <AddBlockButton pageSlug="verze" blockKind="changelog" label="Přidat záznam" />
            </div>
            {!hasBlocks && (
              <>
                <EmptyState
                  title="Zatím žádné záznamy"
                  description="Přidej první záznam tlačítkem výše."
                />
                {page?.content_html && (
                  <div className="rounded-lg border border-dashed border-border bg-card/40 p-6">
                    <div className="mb-2 font-heading text-sm text-muted-foreground">
                      Stávající obsah (dosud nepřevedený na komponenty):
                    </div>
                    <CellViewer html={page.content_html} className="prose prose-stone max-w-none opacity-70" />
                  </div>
                )}
              </>
            )}
            {grouped.map(([year, items]) => (
              <section key={year} className="relative">
                <div className="mb-6 flex items-center gap-3">
                  <span className="font-heading text-4xl font-bold text-primary md:text-5xl">{year || '—'}</span>
                  <div className="h-px flex-1 bg-border" />
                  <span className="font-accent text-sm italic text-muted-foreground">
                    {items.length} {items.length === 1 ? 'aktualizace' : items.length < 5 ? 'aktualizace' : 'aktualizací'}
                  </span>
                </div>
                <div className="relative ml-3 space-y-4 border-l-2 border-border pl-8">
                  {items.map((b) => (
                    <div key={b.id} className="relative">
                      <span className="absolute -left-[2.4rem] top-2 flex h-4 w-4 items-center justify-center rounded-full border-2 border-primary bg-background">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      </span>
                      <div className="rounded-lg border border-border bg-card/70 p-4 shadow-sm backdrop-blur-sm transition-all hover:border-primary/40 hover:shadow-md">
                        <div className="mb-1 flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 font-heading text-sm font-bold text-primary">
                            <Sparkles className="h-3.5 w-3.5 text-accent" />
                            {b.data.date}
                          </div>
                          <BlockEditAffordance block={b} />
                        </div>
                        <p className="font-body text-sm leading-relaxed text-foreground">{b.data.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : page?.content_html ? (
          <div className="rounded-lg border border-border bg-card/60 p-6 shadow-sm backdrop-blur-sm md:p-8">
            <div className="mb-4 flex items-center gap-2 font-heading text-lg text-primary">
              <History className="h-5 w-5" />
              Přehled aktualizací
            </div>
            <CellViewer html={page.content_html} className="prose prose-stone max-w-none" />
          </div>
        ) : (
          <EmptyState title="Stránka zatím nemá obsah" />
        )}
      </article>
    </>
  );
}
