/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Vloženo Vite (define) — unikátní ID buildu pro buster persistované cache. */
declare const __APP_BUILD_ID__: string;
