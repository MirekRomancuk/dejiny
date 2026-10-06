import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  // Unikátní ID buildu — „buster" persistované cache: každý build (deploy)
  // zneplatní starou cache na disku (pojistka při změně tvaru dat/kódu).
  define: {
    __APP_BUILD_ID__: JSON.stringify(String(Date.now())),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2020',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('@tiptap') || id.includes('prosemirror') || id.includes('tiptap-extension-font-size')) {
              return 'tiptap';
            }
            if (id.includes('xlsx')) return 'xlsx';
            if (id.includes('yet-another-react-lightbox')) return 'lightbox';
            if (id.includes('@radix-ui') || id.includes('cmdk') || id.includes('sonner')) return 'ui';
            if (id.includes('@tanstack')) return 'tanstack';
            if (id.includes('react-dom') || id.includes('react-router')) return 'react';
          }
          return undefined;
        },
      },
    },
  },
});
