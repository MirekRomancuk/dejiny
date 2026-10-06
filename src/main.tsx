import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { get, set, del } from 'idb-keyval';
import { Toaster } from 'sonner';
import App from './App';
import { queryClient } from '@/lib/queryClient';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import './index.css';

// Cache React Query se ukládá do IndexedDB → přežije reload / novou záložku.
// Data se zobrazí okamžitě z disku, čerstvost hlídá verzní dotaz (viz useEvents).
const persister = createAsyncStoragePersister({
  storage: {
    getItem: (key) => get(key),
    setItem: (key, value) => set(key, value),
    removeItem: (key) => del(key),
  },
  key: 'dkc-react-query',
  throttleTime: 1000,
});

// Persistujeme JEN veřejná, serializovatelná data (default-deny). Vynecháváme:
//  - 'event-types' (queryFn vrací Map → JSON serializace by je rozbila na {})
//  - 'profile'/'session'/'images'/'storage'/'admin-*' (soukromá data adminů na sdíleném PC)
const PERSIST_ALLOW = new Set(['events', 'rulers', 'pages', 'page-blocks', 'bibliography', 'calendar', 'settings']);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: 7 * 24 * 60 * 60_000, // pojistka: cokoli staršího než 7 dní se zahodí
          buster: __APP_BUILD_ID__, // každý deploy zneplatní starou cache (změna tvaru dat/kódu)
          dehydrateOptions: {
            // Persistuj jen úspěšné dotazy z whitelistu veřejných klíčů.
            shouldDehydrateQuery: (q) =>
              q.state.status === 'success' && PERSIST_ALLOW.has(String(q.queryKey?.[0])),
          },
        }}
      >
        <BrowserRouter>
          <App />
          <Toaster richColors position="top-right" />
        </BrowserRouter>
      </PersistQueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
