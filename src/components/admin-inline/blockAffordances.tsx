import { EditAffordance } from './EditAffordance';
import { useAdminEdit } from './AdminEditProvider';
import { useBlockMutations } from '@/hooks/usePageBlocks';
import { BLOCK_LABELS } from './blockKinds';
import type { BlockKind, PageBlock } from '@/types/domain';

/** Tlačítko „+“ pro přidání nové komponenty daného druhu (jen pro admina). */
export function AddBlockButton({
  pageSlug,
  blockKind,
  label,
  className,
}: {
  pageSlug: string;
  blockKind: BlockKind;
  label?: string;
  className?: string;
}) {
  const { isAdmin, openEditor } = useAdminEdit();
  if (!isAdmin) return null;
  return (
    <EditAffordance
      className={className}
      onAdd={() => openEditor({ kind: 'block', mode: 'create', pageSlug, blockKind })}
      addLabel={label ?? `Přidat: ${BLOCK_LABELS[blockKind]}`}
    />
  );
}

/** Ikony upravit/smazat u jedné komponenty (jen pro admina). */
export function BlockEditAffordance({ block, className }: { block: PageBlock; className?: string }) {
  const { isAdmin, openEditor } = useAdminEdit();
  const { del } = useBlockMutations(block.page_slug);
  if (!isAdmin) return null;
  return (
    <EditAffordance
      size="sm"
      className={className}
      editLabel="Upravit komponentu"
      deleteLabel="Smazat komponentu"
      confirmTitle="Smazat komponentu?"
      confirmDescription="Tato komponenta bude trvale odstraněna ze stránky."
      onEdit={() => openEditor({ kind: 'block', mode: 'edit', block })}
      onDelete={() => del.mutate(block.id)}
    />
  );
}
