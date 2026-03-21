/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** Si es "true", la pantalla Importaciones inicia en modo solo simulación. */
  readonly VITE_IMPORT_SIMULATION_DEFAULT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
