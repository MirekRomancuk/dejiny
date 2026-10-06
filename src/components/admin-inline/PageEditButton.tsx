import { Pencil } from 'lucide-react';
import { useAdminEdit } from './AdminEditProvider';

/** Tlačítko „Upravit stránku" pro obsahové stránky (jen pro admina). */
export function PageEditButton({
  slug,
  label,
  hasContent = true,
}: {
  slug: string;
  label: string;
  /** Když false, editor v draweru skryje pole obsahu (jen titulek + podtitulek). */
  hasContent?: boolean;
}) {
  const { isAdmin, openEditor } = useAdminEdit();
  if (!isAdmin) return null;
  return (
    <div className="mx-auto flex max-w-6xl justify-end px-4 pt-4">
      <button
        type="button"
        onClick={() => openEditor({ kind: 'page', slug, label, hasContent })}
        className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 px-2.5 py-1 font-heading text-xs font-semibold uppercase tracking-wider text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
      >
        <Pencil className="h-3.5 w-3.5" /> Upravit stránku
      </button>
    </div>
  );
}
