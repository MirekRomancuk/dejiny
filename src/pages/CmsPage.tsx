import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queryKeys';
import { Loading } from '@/components/common/Loading';
import { EmptyState } from '@/components/common/EmptyState';
import { CellViewer } from '@/components/events/CellViewer';
import { HeroHeader } from '@/components/layout/HeroHeader';
import type { Page } from '@/types/domain';

interface Props {
  slug: string;
  fallbackTitle: string;
}

export function CmsPage({ slug, fallbackTitle }: Props) {
  const { data: page, isLoading, error } = useQuery<Page | null>({
    queryKey: qk.pages.one(slug),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as Page | null;
    },
  });

  const title = (page?.title ?? fallbackTitle).toUpperCase();

  if (isLoading) {
    return (
      <>
        <HeroHeader pageTitle={title} />
        <Loading />
      </>
    );
  }
  if (error) {
    return (
      <>
        <HeroHeader pageTitle={title} />
        <div className="mx-auto max-w-[1400px] px-4 py-8">
          <EmptyState title="Chyba načítání stránky" description={(error as Error).message} />
        </div>
      </>
    );
  }
  return (
    <>
      <HeroHeader pageTitle={title} />
      <article className="mx-auto max-w-[1400px] px-4 py-8">
        {!page?.content_html ? (
          <EmptyState
            title="Stránka zatím nemá obsah"
            description="Obsah doplní administrátor v adminu."
          />
        ) : (
          <div className="rounded-lg border border-border bg-card/60 p-6 shadow-sm backdrop-blur-sm md:p-8">
            <CellViewer html={page.content_html} className="prose prose-stone max-w-none" />
          </div>
        )}
      </article>
    </>
  );
}
