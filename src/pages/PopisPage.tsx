import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import { ArrowDown, ArrowUp, ExternalLink, Feather, ScrollText, BookOpen, Link2, Library, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queryKeys';
import { HeroHeader } from '@/components/layout/HeroHeader';
import { PageEditButton } from '@/components/admin-inline/PageEditButton';
import { EditAffordance } from '@/components/admin-inline/EditAffordance';
import { AddBlockButton, BlockEditAffordance } from '@/components/admin-inline/blockAffordances';
import { useAdminEdit } from '@/components/admin-inline/AdminEditProvider';
import { useBibliographyMutations } from '@/hooks/useBibliographyMutations';
import { usePageBlocks, blocksOfKind } from '@/hooks/usePageBlocks';
import { Loading } from '@/components/common/Loading';
import { EmptyState } from '@/components/common/EmptyState';
import { CellViewer } from '@/components/events/CellViewer';
import { MapPreview } from '@/components/MapPreview';
import { cleanCmsHtml, parsePopisSections, type BookReference } from '@/lib/cmsParsers';
import {
  getBibliographyOrderUpdates,
  sortBibliographyByDisplayOrder,
  type BibliographyOrderUpdate,
} from '@/lib/bibliography';
import { cn } from '@/lib/cn';
import type { Page, BibliographyEntry, TypedBlock } from '@/types/domain';

interface BibItem {
  display: BookReference;
  entry?: BibliographyEntry;
}

export function PopisPage() {
  const { isAdmin, openEditor } = useAdminEdit();
  const { del, reorder } = useBibliographyMutations();

  const { data: page, isLoading: pageLoading } = useQuery<Page | null>({
    queryKey: qk.pages.one('popis'),
    queryFn: async () => {
      const { data, error } = await supabase.from('pages').select('*').eq('slug', 'popis').maybeSingle();
      if (error) throw error;
      return (data ?? null) as Page | null;
    },
  });

  const { data: blocks = [], isLoading: blocksLoading } = usePageBlocks('popis');
  const hasBlocks = blocks.length > 0;
  const intro = blocksOfKind(blocks, 'popis_intro')[0];
  const sections = blocksOfKind(blocks, 'popis_section');
  const map = blocksOfKind(blocks, 'popis_map')[0];

  // Bibliografie (samostatná tabulka, už granulární)
  const { data: tableBibs } = useQuery<BibliographyEntry[]>({
    queryKey: qk.bibliography,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bibliography')
        .select('*')
        .order('display_order')
        .order('year');
      if (error) throw error;
      return (data ?? []) as BibliographyEntry[];
    },
  });
  const usingTableSource = !!tableBibs && tableBibs.length > 0;
  const parsedBib = useMemo(
    () => (!usingTableSource && page ? parsePopisSections(page.content_html)?.bibliography : undefined),
    [usingTableSource, page],
  );
  const bibItems: BibItem[] = useMemo(() => {
    if (tableBibs && tableBibs.length > 0) {
      return sortBibliographyByDisplayOrder(tableBibs).map((b) => ({
        entry: b,
        display: { author: b.author, title: b.title, year: b.year ?? undefined, imageUrl: b.image_url ?? undefined },
      }));
    }
    return (parsedBib ?? []).map((display) => ({ display }));
  }, [tableBibs, parsedBib]);

  const isLoading = pageLoading || blocksLoading;

  return (
    <>
      <HeroHeader
        pageTitle={page?.title?.trim() || 'POPIS'}
        pageSubtitle={page?.subtitle?.trim() || 'O webu, jeho cílech a poslání'}
      />
      <PageEditButton slug="popis" label="Popis" hasContent={false} />
      <div className="mx-auto max-w-6xl px-4 py-10">
        {isLoading ? (
          <Loading />
        ) : hasBlocks || isAdmin || bibItems.length > 0 ? (
          <StructuredPopis
            intro={intro}
            sections={sections}
            map={map}
            fallbackHtml={!hasBlocks ? page?.content_html ?? undefined : undefined}
            bibItems={bibItems}
            usingTableSource={usingTableSource}
            isAdmin={isAdmin}
            onAddBook={() => openEditor({ kind: 'bibliography', mode: 'create' })}
            onEditBook={(entry) => openEditor({ kind: 'bibliography', mode: 'edit', entry })}
            onDeleteBook={(id) => del.mutate(id)}
            onMoveBook={(updates) => reorder.mutate(updates)}
            isReorderingBooks={reorder.isPending}
          />
        ) : page?.content_html ? (
          <article className="mx-auto max-w-3xl">
            <div className="rounded-xl border border-border bg-card/60 p-6 shadow-sm backdrop-blur-sm md:p-10">
              <CellViewer
                html={cleanCmsHtml(page.content_html)}
                className="prose prose-stone max-w-none font-body text-base leading-relaxed prose-headings:font-heading prose-headings:text-primary prose-p:my-4 prose-img:rounded-lg prose-img:shadow-sm"
              />
            </div>
          </article>
        ) : (
          <EmptyState title="Stránka zatím nemá obsah" />
        )}
      </div>
    </>
  );
}

interface StructuredProps {
  intro?: TypedBlock<'popis_intro'>;
  sections: TypedBlock<'popis_section'>[];
  map?: TypedBlock<'popis_map'>;
  /** Dosud nepřevedený obsah (content_html) — zobrazí se, dokud nejsou žádné strukturní bloky. */
  fallbackHtml?: string;
  bibItems: BibItem[];
  usingTableSource: boolean;
  isAdmin: boolean;
  onAddBook: () => void;
  onEditBook: (entry: BibliographyEntry) => void;
  onDeleteBook: (id: number) => void;
  onMoveBook: (updates: BibliographyOrderUpdate[]) => void;
  isReorderingBooks: boolean;
}

function StructuredPopis({
  intro,
  sections,
  map,
  fallbackHtml,
  bibItems,
  usingTableSource,
  isAdmin,
  onAddBook,
  onEditBook,
  onDeleteBook,
  onMoveBook,
  isReorderingBooks,
}: StructuredProps) {
  const showBibliography = bibItems.length > 0 || isAdmin;
  const hasStructuredBody = !!intro || sections.length > 0 || !!map;

  const tocItems = useMemo(() => {
    const items = sections.map((s) => ({ id: `sekce-${s.id}`, heading: s.data.heading }));
    if (map) items.push({ id: 'mapa', heading: 'Mapa míst' });
    if (showBibliography) items.push({ id: 'literatura', heading: 'Použitá literatura' });
    return items;
  }, [sections, map, showBibliography]);

  return (
    <div className="grid gap-10 lg:grid-cols-[260px_1fr]">
      <aside className="hidden lg:block">
        <nav className="sticky top-6">
          <div className="mb-3 flex items-center gap-2 font-heading text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <ScrollText className="h-3.5 w-3.5" />
            Obsah stránky
          </div>
          <ul className="space-y-1 border-l-2 border-border pl-3 text-sm">
            {tocItems.map((s, idx) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="block py-1.5 font-body text-muted-foreground transition-colors hover:text-primary"
                >
                  <span className="mr-2 font-heading text-xs font-bold text-accent">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  {s.heading}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <article className="min-w-0 space-y-12">
        {!hasStructuredBody && fallbackHtml && (
          <div className="rounded-xl border border-dashed border-border bg-card/40 p-6 shadow-sm backdrop-blur-sm md:p-8">
            {isAdmin && (
              <div className="mb-3 font-heading text-sm text-muted-foreground">
                Stávající obsah (dosud nepřevedený na komponenty). Přidávej sekce tlačítky „+“ níže:
              </div>
            )}
            <CellViewer
              html={cleanCmsHtml(fallbackHtml)}
              className="prose prose-stone max-w-none font-body text-base leading-relaxed prose-headings:font-heading prose-headings:text-primary prose-p:my-4 prose-img:rounded-lg prose-img:shadow-sm"
            />
          </div>
        )}

        {/* Úvod (0–1) */}
        {intro ? (
          <section className="relative rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/5 via-card/70 to-card/60 p-6 shadow-sm backdrop-blur-sm md:p-10">
            <Feather
              className="absolute -left-3 -top-3 h-10 w-10 -rotate-12 text-accent drop-shadow-sm"
              strokeWidth={1.2}
            />
            <BlockEditAffordance block={intro} className="absolute right-3 top-3" />
            <CellViewer
              html={cleanCmsHtml(intro.data.bodyHtml)}
              className={cn(
                'prose prose-stone max-w-none font-body text-lg italic leading-relaxed',
                'prose-p:my-3 prose-p:text-foreground/85',
                'prose-img:rounded-lg prose-img:shadow-sm',
                "[&>p:first-child:first-letter]:float-left [&>p:first-child:first-letter]:mr-2 [&>p:first-child:first-letter]:font-heading [&>p:first-child:first-letter]:text-5xl [&>p:first-child:first-letter]:font-bold [&>p:first-child:first-letter]:leading-none [&>p:first-child:first-letter]:text-primary",
              )}
            />
          </section>
        ) : (
          isAdmin && (
            <div className="flex items-center gap-3 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              <span>Úvodní odstavec zatím není.</span>
              <AddBlockButton pageSlug="popis" blockKind="popis_intro" label="Přidat úvod" />
            </div>
          )
        )}

        {/* Sekce */}
        {sections.map((s, idx) => (
          <section key={s.id} id={`sekce-${s.id}`} className="scroll-mt-6">
            <header className="mb-5 flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 font-heading text-xl font-bold text-primary">
                {String(idx + 1).padStart(2, '0')}
              </span>
              <div className="flex-1 pt-1">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-heading text-2xl font-bold tracking-wide text-primary md:text-3xl">
                    {s.data.heading}
                  </h2>
                  <BlockEditAffordance block={s} />
                </div>
                <div className="mt-2 h-px w-16 bg-accent" />
              </div>
            </header>
            <div className="rounded-xl border border-border bg-card/60 p-5 shadow-sm backdrop-blur-sm md:p-8">
              <CellViewer
                html={cleanCmsHtml(s.data.bodyHtml)}
                className={cn(
                  'prose prose-stone max-w-none font-body text-base leading-relaxed',
                  'prose-p:my-3 prose-p:text-foreground/90',
                  'prose-strong:text-foreground prose-strong:font-semibold',
                  'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
                  'prose-img:my-4 prose-img:rounded-lg prose-img:shadow-md',
                  'prose-img:mx-auto prose-img:block',
                )}
              />
            </div>
          </section>
        ))}

        {isAdmin && (
          <div className="flex justify-center">
            <AddBlockButton pageSlug="popis" blockKind="popis_section" label="Přidat sekci" />
          </div>
        )}

        {/* Mapa (0–1) */}
        {map ? (
          <MapBlock block={map} />
        ) : (
          isAdmin && (
            <div className="flex items-center gap-3 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              <span>Sekce „Mapa míst“ zatím není.</span>
              <AddBlockButton pageSlug="popis" blockKind="popis_map" label="Přidat mapu" />
            </div>
          )
        )}

        {/* Bibliografie */}
        {showBibliography && (
          <BibliographyBlock
            items={bibItems}
            usingTableSource={usingTableSource}
            isAdmin={isAdmin}
            onAdd={onAddBook}
            onEdit={onEditBook}
            onDelete={onDeleteBook}
            onMove={onMoveBook}
            isReordering={isReorderingBooks}
          />
        )}

        <footer className="flex flex-wrap items-center justify-center gap-3 border-t border-border/40 pt-8 font-accent text-sm italic text-muted-foreground">
          <BookOpen className="h-4 w-4" />
          <span>Stránky procházejí postupnými aktualizacemi.</span>
          <Link2 className="h-3.5 w-3.5" />
          <a href="/verze" className="text-primary hover:underline">
            Přehled verzí
          </a>
        </footer>
      </article>
    </div>
  );
}

function MapBlock({ block }: { block: TypedBlock<'popis_map'> }) {
  return (
    <section id="mapa" className="scroll-mt-6">
      <header className="mb-5 flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MapPin className="h-6 w-6" />
        </span>
        <div className="flex-1 pt-1">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-heading text-2xl font-bold tracking-wide text-primary md:text-3xl">Mapa míst</h2>
            <BlockEditAffordance block={block} />
          </div>
          <div className="mt-2 h-px w-16 bg-accent" />
        </div>
      </header>
      <div className="rounded-xl border border-border bg-card/60 p-5 shadow-sm backdrop-blur-sm md:p-8">
        {block.data.captionHtml && (
          <CellViewer
            html={cleanCmsHtml(block.data.captionHtml)}
            className="prose prose-sm prose-stone mb-4 max-w-none font-accent italic text-muted-foreground [&>p]:my-0"
          />
        )}
        {block.data.imageUrl && (
          <MapPreview
            imageUrl={block.data.imageUrl}
            mapUrl={block.data.mapUrl}
            alt="Mapa míst v Událostech"
          />
        )}
        {block.data.mapUrl && (
          <a
            href={block.data.mapUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-3 inline-flex items-center gap-1.5 font-heading text-sm font-semibold text-primary hover:underline"
          >
            Otevřít interaktivní mapu
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </section>
  );
}

interface BibliographyBlockProps {
  items: BibItem[];
  usingTableSource: boolean;
  isAdmin: boolean;
  onAdd: () => void;
  onEdit: (entry: BibliographyEntry) => void;
  onDelete: (id: number) => void;
  onMove: (updates: BibliographyOrderUpdate[]) => void;
  isReordering: boolean;
}

function BibliographyBlock({
  items,
  usingTableSource,
  isAdmin,
  onAdd,
  onEdit,
  onDelete,
  onMove,
  isReordering,
}: BibliographyBlockProps) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const canAdd = usingTableSource || items.length === 0;

  function moveBook(index: number, direction: -1 | 1) {
    const entries = items.map((item) => item.entry).filter((entry): entry is BibliographyEntry => Boolean(entry));
    if (entries.length !== items.length) return;
    const updates = getBibliographyOrderUpdates(entries, index, direction);
    if (updates.length > 0) onMove(updates);
  }

  return (
    <section id="literatura" className="scroll-mt-6">
      <header className="mb-5 flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Library className="h-6 w-6" />
        </span>
        <div className="flex-1 pt-1">
          <div className="flex items-center gap-3">
            <h2 className="font-heading text-2xl font-bold tracking-wide text-primary md:text-3xl">
              Použitá literatura
            </h2>
            {isAdmin && canAdd && <EditAffordance onAdd={onAdd} addLabel="Přidat knihu" />}
          </div>
          <p className="mt-1 font-accent text-sm italic text-muted-foreground">
            {items.length} {items.length === 1 ? 'titul' : items.length < 5 ? 'tituly' : 'titulů'} sloužících jako zdroj pro tento web
          </p>
          {isAdmin && !canAdd && (
            <p className="mt-1 text-xs text-muted-foreground">
              Literatura se zatím čte z obsahu stránky. Pro správu jednotlivých titulů je nejdřív přeneste
              do databáze v administraci (<a href="/admin/bibliography" className="text-primary hover:underline">Literatura</a>).
            </p>
          )}
          <div className="mt-2 h-px w-16 bg-accent" />
        </div>
      </header>

      {items.length === 0 ? (
        <EmptyState title="Zatím žádné tituly" description="Přidej první knihu tlačítkem „+“ u nadpisu." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-3">
          {items.map((item, i) => {
            const book = item.display;
            return (
              <div
                key={item.entry?.id ?? i}
                className="group relative flex gap-4 rounded-lg border border-border bg-card/70 p-4 shadow-sm backdrop-blur-sm transition-all hover:border-primary/40 hover:shadow-md"
              >
                {isAdmin && item.entry && (
                  <>
                    <EditAffordance
                      size="sm"
                      className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
                      editLabel="Upravit knihu"
                      deleteLabel="Smazat knihu"
                      confirmTitle="Smazat knihu?"
                      confirmDescription={`„${book.title}“ bude odstraněna ze seznamu literatury.`}
                      onEdit={() => onEdit(item.entry!)}
                      onDelete={() => onDelete(item.entry!.id)}
                    />
                    <div className="absolute bottom-2 right-2 flex gap-0.5 rounded-md border border-border bg-background/90 p-0.5 shadow-sm">
                      <button
                        type="button"
                        onClick={() => moveBook(i, -1)}
                        disabled={i === 0 || isReordering}
                        className="rounded p-1 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label={`Posunout „${book.title}“ nahoru`}
                        title="Posunout nahoru"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveBook(i, 1)}
                        disabled={i === items.length - 1 || isReordering}
                        className="rounded p-1 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label={`Posunout „${book.title}“ dolů`}
                        title="Posunout dolů"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </>
                )}
                {book.imageUrl ? (
                  <button
                    type="button"
                    onClick={() => setLightboxSrc(book.imageUrl!)}
                    className="flex h-32 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-background shadow-sm transition-transform group-hover:scale-[1.03]"
                    aria-label={`Náhled obálky: ${book.title}`}
                  >
                    <img
                      src={book.imageUrl}
                      alt={book.title}
                      className="h-full w-full cursor-zoom-in object-cover"
                      loading="lazy"
                    />
                  </button>
                ) : (
                  <div className="flex h-32 w-24 shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-muted/30 text-muted-foreground">
                    <BookOpen className="h-8 w-8 opacity-30" />
                  </div>
                )}
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="font-heading text-sm font-bold leading-tight text-foreground">{book.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{book.author}</div>
                  {book.year && <div className="mt-auto pt-2 font-accent text-xs italic text-accent">{book.year}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {lightboxSrc && <Lightbox open={true} close={() => setLightboxSrc(null)} slides={[{ src: lightboxSrc }]} />}
    </section>
  );
}
