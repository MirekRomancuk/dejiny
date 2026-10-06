import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queryKeys';

/**
 * Mutace událostí pro inline editaci mimo formulář (mazání).
 * Vytváření/úprava probíhá přímo v `EventForm`. Po zápisu invaliduje `qk.events.all`,
 * takže se obnoví časová osa i tabulka (obě čtou stejný dotaz).
 */
export function useEventMutations() {
  const qc = useQueryClient();

  const deleteEvent = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      toast.success('Událost smazána');
      qc.invalidateQueries({ queryKey: qk.events.all });
      qc.invalidateQueries({ queryKey: qk.calendar });
    },
    onError: (e: Error) => toast.error(`Smazání selhalo: ${e.message}`),
  });

  return { deleteEvent };
}
