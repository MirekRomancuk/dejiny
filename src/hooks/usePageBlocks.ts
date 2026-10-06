import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queryKeys';
import type { BlockKind, PageBlock, TypedBlock } from '@/types/domain';

/** Načte komponenty (bloky) stránky seřazené podle pozice. */
export function usePageBlocks(slug: string) {
  return useQuery<PageBlock[]>({
    queryKey: qk.pageBlocks(slug),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('page_blocks')
        .select('*')
        .eq('page_slug', slug)
        .order('position');
      if (error) throw error;
      return (data ?? []) as PageBlock[];
    },
  });
}

/** Vyfiltruje bloky daného druhu se zúžením typu (`block.data` odpovídá druhu). */
export function blocksOfKind<K extends BlockKind>(blocks: PageBlock[], kind: K): TypedBlock<K>[] {
  return blocks.filter((b): b is TypedBlock<K> => b.kind === kind);
}

interface SaveInput {
  id?: number;
  kind: BlockKind;
  data: Record<string, string>;
}

/** Mutace komponent stránky (uložení/smazání) pro daný slug. */
export function useBlockMutations(slug: string) {
  const qc = useQueryClient();

  const save = useMutation({
    mutationFn: async (input: SaveInput) => {
      if (input.id) {
        const { error } = await supabase
          .from('page_blocks')
          .update({ data: input.data, updated_at: new Date().toISOString() })
          .eq('id', input.id);
        if (error) throw error;
      } else {
        // Nový blok se přidá na konec (nejvyšší position pro stránku + 1).
        const { data: rows, error: posErr } = await supabase
          .from('page_blocks')
          .select('position')
          .eq('page_slug', slug)
          .order('position', { ascending: false })
          .limit(1);
        if (posErr) throw posErr;
        const nextPos = rows && rows.length > 0 ? (rows[0] as { position: number }).position + 1 : 0;
        const { error } = await supabase
          .from('page_blocks')
          .insert({ page_slug: slug, kind: input.kind, position: nextPos, data: input.data });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Uloženo');
      qc.invalidateQueries({ queryKey: qk.pageBlocks(slug) });
    },
    onError: (e: Error) => toast.error(`Uložení selhalo: ${e.message}`),
  });

  const del = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('page_blocks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Smazáno');
      qc.invalidateQueries({ queryKey: qk.pageBlocks(slug) });
    },
    onError: (e: Error) => toast.error(`Smazání selhalo: ${e.message}`),
  });

  return { save, del };
}
