import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queryKeys';
import type { Event, EventType, Ruler, TypeCode } from '@/types/domain';

// PostgREST vrací max 1000 řádků na odpověď (server-side strop `max-rows`).
const PAGE_SIZE = 1000;

// Sloupce načítané pro veřejné zobrazení + inline editaci. Záměrně BEZ:
//  - `search_tsv` (tsvector jen pro server-side fulltext; ~29 % payloadu, klient ho nečte)
//  - `created_at`, `updated_at`, `source_excel_row`, `source_joomla_id` (klient je u událostí nepoužívá;
//    řazení podle `source_joomla_id` funguje i bez jeho výběru).
const EVENT_COLUMNS = [
  'id', 'year_text', 'year_numeric', 'ruler_id', 'type_id', 'date_text', 'month',
  'content_html', 'wiki_url', 'wiki_label', 'maps_url', 'maps_label', 'toulky_url',
  'highlight', 'osobnost', 'poznamka', 'image_refs', 'show_in_calendar', 'calendar_text', 'ordering',
].join(',');

/**
 * Levný „otisk" dat událostí = počet řádků + nejnovější `updated_at`.
 * Trigger `trg_events_tsv` bumpuje `updated_at` na každý insert/update; delete
 * zachytí `count`. Jeden malý dotaz (1 řádek + count v hlavičce). Vstupuje do
 * klíče `useAllEvents` → jakmile se otisk změní (admin něco upravil), stáhnou se
 * čerstvá data; dokud je stejný, servíruje se z (persistované) cache.
 */
export function useEventsVersion() {
  return useQuery<string>({
    queryKey: qk.events.version,
    queryFn: async () => {
      const { data, count, error } = await supabase
        .from('events')
        .select('updated_at', { count: 'exact' })
        .order('updated_at', { ascending: false })
        .limit(1);
      if (error) throw error;
      const latest = (data?.[0] as { updated_at?: string } | undefined)?.updated_at ?? '';
      return `${count ?? 0}:${latest}`;
    },
    // Vždy ověř otisk při načtení (i po reloadu) → admin uvidí svou právě uloženou
    // změnu ihned, i kdyby persistence ještě nestihla zapsat na disk. Dotaz je drobný.
    staleTime: 0,
  });
}

export function useAllEvents() {
  // Verze (otisk) je součástí klíče — změna dat ⇒ nový klíč ⇒ čerstvé stažení.
  const { data: version } = useEventsVersion();
  return useQuery<Event[]>({
    queryKey: [...qk.events.all, version ?? 'init'],
    enabled: version !== undefined,
    placeholderData: keepPreviousData, // při změně verze ukazuj stará data, ne prázdno
    queryFn: async () => {
      // 1) Levně zjistíme počet řádků (bez přenosu dat) → kolik stránek stáhnout.
      const { count, error: countErr } = await supabase
        .from('events')
        .select('id', { count: 'exact', head: true });
      if (countErr) throw countErr;
      const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

      // 2) Všechny stránky paralelně (identické řazení → okna se nepřekrývají ani nevynechávají).
      const results = await Promise.all(
        Array.from({ length: pages }, (_, i) =>
          supabase
            .from('events')
            .select(EVENT_COLUMNS)
            .order('year_numeric', { ascending: true, nullsFirst: false })
            .order('source_joomla_id', { ascending: true })
            .order('ordering', { ascending: true })
            .range(i * PAGE_SIZE, i * PAGE_SIZE + PAGE_SIZE - 1),
        ),
      );

      const all: Event[] = [];
      for (const r of results) {
        if (r.error) throw r.error;
        all.push(...((r.data ?? []) as unknown as Event[]));
      }
      return all;
    },
    // Neinvaliduje čas, ale změna verze v klíči → data se nestahují znovu, dokud
    // se opravdu nezmění (viz useEventsVersion). Persistence do IndexedDB (main.tsx)
    // je zobrazí okamžitě i po reloadu.
    staleTime: Infinity,
  });
}

export function useEventTypes() {
  return useQuery<{ list: EventType[]; byId: Map<number, TypeCode>; byCode: Map<TypeCode, number> }>({
    queryKey: qk.eventTypes,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_types')
        .select('*')
        .order('display_order');
      if (error) throw error;
      const list = (data ?? []) as EventType[];
      const byId = new Map<number, TypeCode>();
      const byCode = new Map<TypeCode, number>();
      for (const t of list) {
        byId.set(t.id, t.code as TypeCode);
        byCode.set(t.code as TypeCode, t.id);
      }
      return { list, byId, byCode };
    },
    staleTime: Infinity,
  });
}

export function useRulers() {
  return useQuery<Ruler[]>({
    queryKey: qk.rulers,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rulers')
        .select('*')
        .order('year_from', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Ruler[];
    },
    staleTime: Infinity,
  });
}
