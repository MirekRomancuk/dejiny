import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useProfile } from '@/hooks/useSession';
import type { Event, BibliographyEntry, BlockKind, PageBlock } from '@/types/domain';

/** Co se právě edituje v draweru. */
export type EditTarget =
  | { kind: 'event'; mode: 'create'; prefill?: Partial<Event> }
  | { kind: 'event'; mode: 'edit'; event: Event }
  | { kind: 'page'; slug: string; label: string; hasContent?: boolean }
  | { kind: 'bibliography'; mode: 'create' }
  | { kind: 'bibliography'; mode: 'edit'; entry: BibliographyEntry }
  | { kind: 'block'; mode: 'create'; pageSlug: string; blockKind: BlockKind }
  | { kind: 'block'; mode: 'edit'; block: PageBlock };

interface AdminEditActions {
  isAdmin: boolean;
  openEditor: (t: EditTarget) => void;
  closeEditor: () => void;
}

// Dva kontexty: stabilní „akce" (mění se jen při přihlášení) a „target" (mění se při
// otevření/zavření draweru). Díky tomu otevření draweru nepřekresluje konzumenty akcí
// (stovky uzlů osy) — target sleduje jen samotný drawer.
const ActionsContext = createContext<AdminEditActions>({
  isAdmin: false,
  openEditor: () => {},
  closeEditor: () => {},
});
const TargetContext = createContext<EditTarget | null>(null);

export function useAdminEdit(): AdminEditActions {
  return useContext(ActionsContext);
}
export function useEditTarget(): EditTarget | null {
  return useContext(TargetContext);
}

/** Poskytuje `isAdmin` a stav editačního draweru veřejnému webu. */
export function AdminEditProvider({ children }: { children: ReactNode }) {
  const { isAdmin } = useProfile();
  const [target, setTarget] = useState<EditTarget | null>(null);

  const openEditor = useCallback((t: EditTarget) => setTarget(t), []);
  const closeEditor = useCallback(() => setTarget(null), []);

  const actions = useMemo<AdminEditActions>(
    () => ({ isAdmin, openEditor, closeEditor }),
    [isAdmin, openEditor, closeEditor],
  );

  return (
    <ActionsContext.Provider value={actions}>
      <TargetContext.Provider value={target}>{children}</TargetContext.Provider>
    </ActionsContext.Provider>
  );
}
