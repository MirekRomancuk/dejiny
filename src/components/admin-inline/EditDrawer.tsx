import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { EventForm } from '@/components/admin/EventForm';
import { useAdminEdit, useEditTarget } from './AdminEditProvider';
import { PageContentForm } from './PageContentForm';
import { BibliographyForm } from './BibliographyForm';
import { BlockForm } from './BlockForm';
import { BLOCK_LABELS } from './blockKinds';

/** Boční drawer hostící editační formuláře (událost / stránka / bibliografie / komponenta). Řízen providerem. */
export function EditDrawer() {
  const { closeEditor } = useAdminEdit();
  const target = useEditTarget();
  const open = target !== null;

  let title = '';
  if (target?.kind === 'event') title = target.mode === 'create' ? 'Nová událost' : 'Úprava události';
  else if (target?.kind === 'page') title = `Úprava stránky: ${target.label}`;
  else if (target?.kind === 'bibliography') title = target.mode === 'create' ? 'Nová kniha' : 'Úprava knihy';
  else if (target?.kind === 'block') {
    const label = target.mode === 'create' ? BLOCK_LABELS[target.blockKind] : BLOCK_LABELS[target.block.kind];
    title = target.mode === 'create' ? `Nová komponenta: ${label}` : `Úprava: ${label}`;
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) closeEditor(); }}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          {target?.kind === 'event' && target.mode === 'create' && (
            <EventForm mode="create" prefill={target.prefill} hideChrome onSaved={closeEditor} />
          )}
          {target?.kind === 'event' && target.mode === 'edit' && (
            <EventForm
              mode="edit"
              initial={target.event}
              hideChrome
              onSaved={closeEditor}
              onDeleted={closeEditor}
            />
          )}
          {target?.kind === 'page' && (
            <PageContentForm slug={target.slug} hasContent={target.hasContent} onSaved={closeEditor} />
          )}
          {target?.kind === 'bibliography' && (
            <BibliographyForm
              initial={target.mode === 'edit' ? target.entry : null}
              onSaved={closeEditor}
              onDeleted={closeEditor}
            />
          )}
          {target?.kind === 'block' && (
            <BlockForm
              pageSlug={target.mode === 'edit' ? target.block.page_slug : target.pageSlug}
              blockKind={target.mode === 'edit' ? target.block.kind : target.blockKind}
              initial={target.mode === 'edit' ? target.block : null}
              onSaved={closeEditor}
              onDeleted={closeEditor}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
