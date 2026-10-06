export interface YearRulerEvent {
  year_numeric: number | null;
  ruler_id: number | null;
}

/**
 * Vrátí unikátní panovníky skutečně přiřazené událostem v jednom roce.
 * Pořadí odpovídá prvnímu výskytu v datech, což zachovává historické přechody.
 */
export function rulerIdsForYear(
  events: readonly YearRulerEvent[],
  year: number | null,
): number[] {
  if (year === null) return [];

  const ids: number[] = [];
  const seen = new Set<number>();
  for (const event of events) {
    if (event.year_numeric !== year || event.ruler_id === null || seen.has(event.ruler_id)) continue;
    seen.add(event.ruler_id);
    ids.push(event.ruler_id);
  }
  return ids;
}

/** Jednoznačný rok lze bezpečně předvyplnit, přechodový rok musí vybrat editor. */
export function autoRulerIdForYear(rulerIds: readonly number[]): number | null {
  return rulerIds.length === 1 ? rulerIds[0] ?? null : null;
}

/** Nový záznam v roce s doloženým panovníkem nesmí zůstat bez přiřazení. */
export function rulerSelectionRequired(
  rulerIds: readonly number[],
  selectedRulerId: number | null,
): boolean {
  return rulerIds.length > 0 && selectedRulerId === null;
}
