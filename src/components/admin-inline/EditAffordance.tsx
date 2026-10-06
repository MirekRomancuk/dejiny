import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAdminEdit } from './AdminEditProvider';
import { ConfirmDialog } from './ConfirmDialog';

interface Props {
  onEdit?: () => void;
  onAdd?: () => void;
  onDelete?: () => void;
  addLabel?: string;
  editLabel?: string;
  deleteLabel?: string;
  confirmTitle?: string;
  confirmDescription?: string;
  className?: string;
  size?: 'sm' | 'md';
}

/** Editační ikony (tužka / „+" / koš). Renderuje se jen pro přihlášeného admina. */
export function EditAffordance({
  onEdit,
  onAdd,
  onDelete,
  addLabel = 'Přidat',
  editLabel = 'Upravit',
  deleteLabel = 'Smazat',
  confirmTitle,
  confirmDescription,
  className,
  size = 'md',
}: Props) {
  const { isAdmin } = useAdminEdit();
  const [confirmOpen, setConfirmOpen] = useState(false);
  if (!isAdmin) return null;

  const btnSize = size === 'sm' ? 'h-6 w-6' : 'h-7 w-7';
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const base =
    'inline-flex items-center justify-center rounded-md border border-border bg-card/80 text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:border-primary/50 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary';

  return (
    <span className={cn('inline-flex items-center gap-1 align-middle', className)}>
      {onAdd && (
        <button type="button" className={cn(base, btnSize)} aria-label={addLabel} title={addLabel} onClick={onAdd}>
          <Plus className={iconSize} />
        </button>
      )}
      {onEdit && (
        <button type="button" className={cn(base, btnSize)} aria-label={editLabel} title={editLabel} onClick={onEdit}>
          <Pencil className={iconSize} />
        </button>
      )}
      {onDelete && (
        <>
          <button
            type="button"
            className={cn(base, btnSize, 'hover:border-destructive/60 hover:text-destructive')}
            aria-label={deleteLabel}
            title={deleteLabel}
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className={iconSize} />
          </button>
          <ConfirmDialog
            open={confirmOpen}
            title={confirmTitle}
            description={confirmDescription}
            onConfirm={() => onDelete()}
            onOpenChange={setConfirmOpen}
          />
        </>
      )}
    </span>
  );
}
