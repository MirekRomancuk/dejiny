import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queryKeys';

/** Úprava obsahové stránky (title + subtitle + content_html) podle slug. */
export function usePageMutation(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { title: string; subtitle: string | null; content_html?: string }) => {
      const { error } = await supabase
        .from('pages')
        .update(payload)
        .eq('slug', slug);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Stránka uložena');
      qc.invalidateQueries({ queryKey: qk.pages.one(slug) });
      qc.invalidateQueries({ queryKey: qk.pages.all });
    },
    onError: (e: Error) => toast.error(`Uložení selhalo: ${e.message}`),
  });
}
