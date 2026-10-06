import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queryKeys';
import { Loading } from '@/components/common/Loading';
import { EmptyState } from '@/components/common/EmptyState';
import { EventForm } from '@/components/admin/EventForm';
import type { Event } from '@/types/domain';

export function EventEditPage() {
  const { id } = useParams<{ id: string }>();
  const numId = id ? parseInt(id, 10) : NaN;

  const { data: event, isLoading, error } = useQuery<Event | null>({
    queryKey: qk.events.one(numId),
    queryFn: async () => {
      const { data, error } = await supabase.from('events').select('*').eq('id', numId).maybeSingle();
      if (error) throw error;
      return (data ?? null) as Event | null;
    },
    enabled: Number.isFinite(numId),
  });

  if (!Number.isFinite(numId)) {
    return <EmptyState title="Neplatné ID události" />;
  }
  if (isLoading) return <Loading />;
  if (error) return <EmptyState title="Chyba načítání" description={error.message} />;
  if (!event) return <EmptyState title="Událost nenalezena" />;

  return <EventForm initial={event} mode="edit" />;
}
