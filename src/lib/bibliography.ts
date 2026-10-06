export interface BibliographyOrderItem {
  id: number;
  display_order: number;
}

export interface BibliographyOrderUpdate {
  id: number;
  display_order: number;
}

export function sortBibliographyByDisplayOrder<T extends BibliographyOrderItem>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.display_order - b.display_order || a.id - b.id);
}

export function getBibliographyOrderUpdates(
  items: readonly BibliographyOrderItem[],
  index: number,
  direction: -1 | 1,
): BibliographyOrderUpdate[] {
  const adjacentIndex = index + direction;
  const current = items[index];
  const adjacent = items[adjacentIndex];
  if (!current || !adjacent) return [];

  return [
    { id: current.id, display_order: adjacent.display_order },
    { id: adjacent.id, display_order: current.display_order },
  ];
}

export function buildBibliographyReorderPayload<T extends BibliographyOrderItem>(
  items: readonly T[],
  firstId: number,
  secondId: number,
): T[] {
  const ordered = sortBibliographyByDisplayOrder(items);
  const firstIndex = ordered.findIndex((item) => item.id === firstId);
  const secondIndex = ordered.findIndex((item) => item.id === secondId);
  if (firstIndex < 0 || secondIndex < 0 || firstIndex === secondIndex) return [];

  [ordered[firstIndex], ordered[secondIndex]] = [ordered[secondIndex], ordered[firstIndex]];
  return ordered.map((item, display_order) => ({ ...item, display_order }));
}

export function newBibliographyDisplayOrder(nowMs = Date.now()): number {
  // PostgreSQL integer bezpečně pojme epoch seconds do roku 2038. Nová kniha
  // se tak řadí za historické pozice; shodu ve stejné sekundě rozsekne stabilní ID.
  return Math.min(2_147_483_647, Math.floor(nowMs / 1000));
}

export function bibliographyLockToken(value: unknown): string | null {
  if (!value || typeof value !== 'object' || !('token' in value)) return null;
  return typeof value.token === 'string' && value.token ? value.token : null;
}

export function isBibliographyLockExpired(value: unknown, nowMs = Date.now()): boolean {
  if (!value || typeof value !== 'object' || !('expiresAt' in value)) return true;
  return typeof value.expiresAt !== 'number' || value.expiresAt <= nowMs;
}
