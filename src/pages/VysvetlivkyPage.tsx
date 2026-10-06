import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  Crown,
  Globe,
  Globe2,
  Home,
  BookOpen,
  User,
  MapPin,
  HelpCircle,
  Map as MapIcon,
  ExternalLink,
  Image as ImageIcon,
  Radio,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queryKeys';
import { HeroHeader } from '@/components/layout/HeroHeader';
import { PageEditButton } from '@/components/admin-inline/PageEditButton';
import { AddBlockButton, BlockEditAffordance } from '@/components/admin-inline/blockAffordances';
import { usePageBlocks, blocksOfKind } from '@/hooks/usePageBlocks';
import { Loading } from '@/components/common/Loading';
import { EmptyState } from '@/components/common/EmptyState';
import { CellViewer } from '@/components/events/CellViewer';
import { LegendIconImages } from '@/components/LegendIconImages';
import { useProfile } from '@/hooks/useSession';
import type { Page, ExternalLinkIcon } from '@/types/domain';

function columnIcon(term: string): React.ComponentType<{ className?: string }> {
  const lower = term.toLowerCase();
  if (lower.includes('rok')) return Calendar;
  if (lower.includes('panov')) return Crown;
  if (lower.includes('zahranič')) return Globe2;
  if (lower.includes('domác')) return Home;
  if (lower.includes('umění') || lower.includes('vzdělanost')) return BookOpen;
  if (lower.includes('osobnost')) return User;
  if (lower.includes('mís')) return MapPin;
  return HelpCircle;
}

const EXT_ICON: Record<
  ExternalLinkIcon,
  { Icon: React.ComponentType<{ className?: string }>; icon: string; bg: string }
> = {
  wikipedia: { Icon: Globe, icon: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-500/10' },
  mapy: { Icon: MapIcon, icon: 'text-green-700 dark:text-green-400', bg: 'bg-green-500/10' },
  galerie: { Icon: ImageIcon, icon: 'text-accent', bg: 'bg-accent/10' },
  radio: { Icon: Radio, icon: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-500/10' },
  external: { Icon: ExternalLink, icon: 'text-accent', bg: 'bg-accent/10' },
};

export function VysvetlivkyPage() {
  const { isAdmin } = useProfile();
  const { data: page } = useQuery<Page | null>({
    queryKey: qk.pages.one('vysvetlivky'),
    queryFn: async () => {
      const { data, error } = await supabase.from('pages').select('*').eq('slug', 'vysvetlivky').maybeSingle();
      if (error) throw error;
      return (data ?? null) as Page | null;
    },
  });

  const { data: blocks = [], isLoading } = usePageBlocks('vysvetlivky');
  const hasBlocks = blocks.length > 0;
  const columns = blocksOfKind(blocks, 'legend_column');
  const icons = blocksOfKind(blocks, 'legend_icon');
  const textColors = blocksOfKind(blocks, 'legend_text_color');
  const dateFormats = blocksOfKind(blocks, 'legend_date_format');
  const extLinks = blocksOfKind(blocks, 'legend_external_link');

  return (
    <>
      <HeroHeader
        pageTitle={page?.title?.trim() || 'VYSVĚTLIVKY'}
        pageSubtitle={page?.subtitle?.trim() || 'Jak číst sloupce a značky v sekci Události'}
      />
      <PageEditButton slug="vysvetlivky" label="Vysvětlivky" hasContent={false} />
      <article className="mx-auto max-w-6xl space-y-12 px-4 py-10">
        {isLoading ? (
          <Loading />
        ) : hasBlocks || isAdmin ? (
          <>
            {!hasBlocks && page?.content_html && (
              <div className="rounded-lg border border-dashed border-border bg-card/40 p-6">
                <div className="mb-2 font-heading text-sm text-muted-foreground">
                  Stávající obsah (dosud nepřevedený na komponenty). Přidávej komponenty tlačítky „+“ níže:
                </div>
                <CellViewer html={page.content_html} className="prose prose-stone max-w-none opacity-70" />
              </div>
            )}
            {/* 1. Sloupce */}
            {(columns.length > 0 || isAdmin) && (
              <Section
                title="Sloupce v sekci Události"
                subtitle="Co znamená každý sloupec v tabulce"
                action={<AddBlockButton pageSlug="vysvetlivky" blockKind="legend_column" />}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  {columns.map((b) => {
                    const Icon = columnIcon(b.data.term);
                    return (
                      <div
                        key={b.id}
                        className="relative flex gap-4 rounded-lg border border-border bg-card/70 p-5 shadow-sm backdrop-blur-sm transition-all hover:border-primary/40 hover:shadow-md"
                      >
                        <BlockEditAffordance block={b} className="absolute right-2 top-2" />
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Icon className="h-6 w-6" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="mb-1.5 font-heading text-base font-bold uppercase tracking-wider text-primary">
                            {b.data.term}
                          </h3>
                          <CellViewer
                            html={b.data.descriptionHtml}
                            className="prose prose-sm prose-stone max-w-none font-body leading-relaxed [&>p]:my-0"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}

            {/* 2. Ikony panovníků */}
            {(icons.length > 0 || isAdmin) && (
              <Section
                title="Ikony u sloupce Panovník"
                subtitle="Symbol u jména panovníka shrnuje jeho odkaz"
                action={<AddBlockButton pageSlug="vysvetlivky" blockKind="legend_icon" />}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  {icons.map((b) => (
                    <div
                      key={b.id}
                      className="relative flex items-center gap-4 rounded-lg border border-border bg-card/70 p-4 shadow-sm backdrop-blur-sm transition-all hover:border-primary/40 hover:shadow-md"
                    >
                      <BlockEditAffordance block={b} className="absolute right-2 top-2" />
                      <LegendIconImages imageUrl={b.data.imageUrl} imageUrl2={b.data.imageUrl2} />
                      <CellViewer
                        html={b.data.descriptionHtml}
                        className="prose prose-sm prose-stone min-w-0 max-w-none font-body leading-relaxed [&>p]:my-0"
                      />
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* 3. Barvy textu */}
            {(textColors.length > 0 || isAdmin) && (
              <Section
                title="Barva textu"
                subtitle="Význam zvýraznění v textu události"
                action={<AddBlockButton pageSlug="vysvetlivky" blockKind="legend_text_color" />}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  {textColors.map((b) => {
                    const desc = b.data.descriptionHtml.toLowerCase();
                    const isPositive = desc.includes('kladné') || desc.includes('pozitiv');
                    const Icon = isPositive ? CheckCircle2 : AlertCircle;
                    const tone = isPositive
                      ? 'border-green-500/40 bg-green-500/5'
                      : 'border-destructive/40 bg-destructive/5';
                    const iconTone = isPositive ? 'text-green-700 dark:text-green-400' : 'text-destructive';
                    return (
                      <div
                        key={b.id}
                        className={`relative flex gap-4 rounded-lg border p-5 shadow-sm backdrop-blur-sm ${tone}`}
                      >
                        <BlockEditAffordance block={b} className="absolute right-2 top-2" />
                        <Icon className={`h-6 w-6 shrink-0 ${iconTone}`} />
                        <div className="flex-1">
                          <div className="mb-1 text-sm">
                            <CellViewer
                              html={b.data.labelHtml}
                              className="prose prose-sm max-w-none font-heading text-base font-bold [&>*]:m-0"
                            />
                          </div>
                          <CellViewer
                            html={b.data.descriptionHtml}
                            className="prose prose-sm prose-stone max-w-none font-body leading-relaxed [&>p]:my-0"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}

            {/* 4. Formáty datumů */}
            {(dateFormats.length > 0 || isAdmin) && (
              <Section
                title="Zápis datumů a období"
                subtitle="Konvence používané ve sloupci „Dat.“"
                action={<AddBlockButton pageSlug="vysvetlivky" blockKind="legend_date_format" />}
              >
                <dl className="grid gap-x-8 gap-y-2 rounded-lg border border-border bg-card/60 p-5 shadow-sm backdrop-blur-sm sm:grid-cols-[max-content_1fr] sm:gap-y-3 md:p-6">
                  {dateFormats.map((b) => (
                    <div key={b.id} className="contents">
                      <dt className="font-mono text-sm font-bold text-primary sm:text-right">{b.data.format}</dt>
                      <dd className="flex items-center gap-2 font-body text-sm text-foreground/85">
                        <span className="flex-1">{b.data.description}</span>
                        <BlockEditAffordance block={b} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </Section>
            )}

            {/* 5. Externí odkazy */}
            {(extLinks.length > 0 || isAdmin) && (
              <Section
                title="Odkazy a externí zdroje"
                subtitle="Ikony za textem události"
                action={<AddBlockButton pageSlug="vysvetlivky" blockKind="legend_external_link" />}
              >
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                  {extLinks.map((b) => {
                    const { Icon, icon, bg } = EXT_ICON[b.data.icon] ?? EXT_ICON.external;
                    return (
                      <div
                        key={b.id}
                        className="relative flex flex-col items-center gap-3 rounded-lg border border-border bg-card/70 p-4 text-center shadow-sm backdrop-blur-sm transition-all hover:border-primary/40 hover:shadow-md"
                      >
                        <BlockEditAffordance block={b} className="absolute right-2 top-2" />
                        <span className={`flex h-14 w-14 items-center justify-center rounded-full ${bg} ${icon}`}>
                          <Icon className="h-7 w-7" />
                        </span>
                        <CellViewer
                          html={b.data.descriptionHtml}
                          className="prose prose-xs prose-stone max-w-none text-center font-body text-xs leading-snug text-muted-foreground [&>p]:my-0"
                        />
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}
          </>
        ) : page?.content_html ? (
          <div className="rounded-lg border border-border bg-card/60 p-6 shadow-sm backdrop-blur-sm md:p-8">
            <CellViewer html={page.content_html} className="prose prose-stone max-w-none" />
          </div>
        ) : (
          <EmptyState title="Stránka zatím nemá obsah" />
        )}
      </article>
    </>
  );
}

function Section({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <header className="mb-5">
        <div className="flex items-center gap-3">
          <h2 className="font-heading text-2xl font-bold tracking-wide text-primary md:text-3xl">{title}</h2>
          {action}
        </div>
        {subtitle && <p className="mt-1 font-accent text-sm italic text-muted-foreground">{subtitle}</p>}
        <div className="mt-3 h-px w-16 bg-accent" />
      </header>
      {children}
    </section>
  );
}
