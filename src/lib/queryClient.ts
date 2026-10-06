import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,
      gcTime: 24 * 60 * 60_000, // 24 h — inaktivní dotazy drž déle (ladí s persistencí do IndexedDB)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
