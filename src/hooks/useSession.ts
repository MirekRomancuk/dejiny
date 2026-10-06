import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, loading };
}

interface Profile {
  id: string;
  email: string | null;
  is_admin: boolean;
}

/**
 * Returns the current user's profile (with is_admin flag).
 * Returns null while loading or when not authenticated.
 */
export function useProfile() {
  const { session, loading: sessionLoading } = useSession();
  const userId = session?.user.id;
  const query = useQuery<Profile | null>({
    queryKey: ['profile', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, is_admin')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as Profile | null;
    },
    staleTime: 60_000,
  });
  return {
    session,
    profile: query.data ?? null,
    isAdmin: query.data?.is_admin === true,
    loading: sessionLoading || query.isLoading,
  };
}
