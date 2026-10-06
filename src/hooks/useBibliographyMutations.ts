import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queryKeys';
import {
  bibliographyLockToken,
  buildBibliographyReorderPayload,
  isBibliographyLockExpired,
  newBibliographyDisplayOrder,
  type BibliographyOrderUpdate,
} from '@/lib/bibliography';
import type { BibliographyEntry } from '@/types/domain';

const BIBLIOGRAPHY_LOCK_KEY = '__bibliography_write_lock';
const BIBLIOGRAPHY_LOCK_TTL_MS = 120_000;
const BIBLIOGRAPHY_LOCK_WAIT_MS = 8_000;

const wait = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

async function acquireBibliographyLock(): Promise<string> {
  const token = crypto.randomUUID();
  const deadline = Date.now() + BIBLIOGRAPHY_LOCK_WAIT_MS;

  while (Date.now() < deadline) {
    const value = { token, expiresAt: Date.now() + BIBLIOGRAPHY_LOCK_TTL_MS };
    const { error } = await supabase.from('settings').insert({ key: BIBLIOGRAPHY_LOCK_KEY, value });
    if (!error) return token;
    if (error.code !== '23505') throw error;

    const { data: existing, error: readError } = await supabase
      .from('settings')
      .select('value')
      .eq('key', BIBLIOGRAPHY_LOCK_KEY)
      .maybeSingle();
    if (readError) throw readError;

    if (existing && isBibliographyLockExpired(existing.value)) {
      const existingToken = bibliographyLockToken(existing.value);
      let staleDelete = supabase.from('settings').delete().eq('key', BIBLIOGRAPHY_LOCK_KEY);
      if (existingToken) staleDelete = staleDelete.contains('value', { token: existingToken });
      const { error: deleteError } = await staleDelete;
      if (deleteError) throw deleteError;
      continue;
    }

    await wait(120 + Math.floor(Math.random() * 120));
  }

  throw new Error('Literaturu právě upravuje jiný administrátor. Zkus to prosím znovu.');
}

async function releaseBibliographyLock(token: string): Promise<void> {
  const { error } = await supabase
    .from('settings')
    .delete()
    .eq('key', BIBLIOGRAPHY_LOCK_KEY)
    .contains('value', { token });
  if (error) throw error;
}

async function withBibliographyLock<T>(operation: () => Promise<T>): Promise<T> {
  const token = await acquireBibliographyLock();
  try {
    return await operation();
  } finally {
    try {
      await releaseBibliographyLock(token);
    } catch (error) {
      // Zámek má TTL, takže případná síťová chyba uvolnění nezablokuje dalšího
      // administrátora trvale ani nezakryje výsledek již provedené operace.
      console.error('Uvolnění zámku literatury selhalo:', error);
    }
  }
}

export interface BibliographyInput {
  id?: number;
  author: string;
  title: string;
  year: number | null;
  image_url: string | null;
}

/**
 * Sdílené mutace pro tabulku `bibliography` (uložení + smazání).
 * Používá je jak admin stránka, tak inline editace na stránce Popis.
 * Po zápisu invaliduje `qk.bibliography`, takže se obnoví admin seznam i sekce
 * „Použitá literatura“ na Popisu. Řazení (display_order) řeší admin zvlášť.
 */
export function useBibliographyMutations() {
  const qc = useQueryClient();
  const reorderInFlight = useRef(false);

  const save = useMutation({
    mutationFn: async (book: BibliographyInput) => withBibliographyLock(async () => {
      const fields = {
        author: book.author,
        title: book.title,
        year: book.year,
        image_url: book.image_url,
      };
      if (book.id) {
        const { error } = await supabase
          .from('bibliography')
          .update(fields)
          .eq('id', book.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('bibliography')
          .insert({ ...fields, display_order: newBibliographyDisplayOrder() });
        if (error) throw error;
      }
    }),
    onSuccess: () => {
      toast.success('Uloženo');
      qc.invalidateQueries({ queryKey: qk.bibliography });
    },
    onError: (e: Error) => toast.error(`Uložení selhalo: ${e.message}`),
  });

  const del = useMutation({
    mutationFn: async (id: number) => withBibliographyLock(async () => {
      const { error } = await supabase.from('bibliography').delete().eq('id', id);
      if (error) throw error;
    }),
    onSuccess: () => {
      toast.success('Smazáno');
      qc.invalidateQueries({ queryKey: qk.bibliography });
    },
    onError: (e: Error) => toast.error(`Smazání selhalo: ${e.message}`),
  });

  const reorder = useMutation({
    mutationFn: async (updates: BibliographyOrderUpdate[]) => {
      if (updates.length !== 2 || reorderInFlight.current) return;
      reorderInFlight.current = true;
      try {
        await withBibliographyLock(async () => {
          const { data: rows, error: loadError } = await supabase
            .from('bibliography')
            .select('*')
            .order('display_order')
            .order('id');
          if (loadError) throw loadError;
          if (!rows || rows.length < 2) throw new Error('K přesunu jsou potřeba alespoň dvě knihy.');

          const reordered = buildBibliographyReorderPayload(
            rows as BibliographyEntry[],
            updates[0].id,
            updates[1].id,
          );
          if (reordered.length !== rows.length) throw new Error('Obě přesouvané knihy musí existovat.');
          const payload = reordered.map(
            ({ id, author, title, year, image_url, display_order }) => ({
              id,
              author,
              title,
              year,
              image_url,
              display_order,
            }),
          );
          // Jeden PostgREST upsert = jeden atomický SQL statement pro celý seznam.
          const { error } = await supabase.from('bibliography').upsert(payload, { onConflict: 'id' });
          if (error) throw error;
        });
      } finally {
        reorderInFlight.current = false;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.bibliography }),
    onError: (e: Error) => toast.error(`Změna pořadí selhala: ${e.message}`),
  });

  return { save, del, reorder };
}
